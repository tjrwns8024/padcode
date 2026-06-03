#!/usr/bin/env python3
"""
Harness Step Executor — phase 내 step을 순차 실행하고 자가 교정한다.

Usage:
    python3 scripts/execute.py <phase-dir> [--push]
"""

import argparse
import contextlib
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import types
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent


@contextlib.contextmanager
def progress_indicator(label: str):
    """터미널 진행 표시기. with 문으로 사용하며 .elapsed 로 경과 시간을 읽는다."""
    frames = "◐◓◑◒"
    stop = threading.Event()
    t0 = time.monotonic()

    def _animate():
        idx = 0
        while not stop.wait(0.12):
            sec = int(time.monotonic() - t0)
            sys.stderr.write(f"\r{frames[idx % len(frames)]} {label} [{sec}s]")
            sys.stderr.flush()
            idx += 1
        sys.stderr.write("\r" + " " * (len(label) + 20) + "\r")
        sys.stderr.flush()

    th = threading.Thread(target=_animate, daemon=True)
    th.start()
    info = types.SimpleNamespace(elapsed=0.0)
    try:
        yield info
    finally:
        stop.set()
        th.join()
        info.elapsed = time.monotonic() - t0


class StepExecutor:
    """Phase 디렉토리 안의 step들을 순차 실행하는 하네스."""

    MAX_RETRIES = 3
    MAX_REVIEW_ROUNDS = 2   # codex 리뷰 거부 시 step 재실행 최대 횟수
    REVIEW_TIMEOUT = 1800   # codex exec 타임아웃(초)
    FEAT_MSG = "feat({phase}): step {num} — {name}"
    CHORE_MSG = "chore({phase}): step {num} output"
    TZ = timezone(timedelta(hours=9))

    def __init__(self, phase_dir_name: str, *, auto_push: bool = False,
                 review_enabled: bool = True):
        self._root = str(ROOT)
        self._phases_dir = ROOT / "phases"
        self._phase_dir = self._phases_dir / phase_dir_name
        self._phase_dir_name = phase_dir_name
        self._top_index_file = self._phases_dir / "index.json"
        self._auto_push = auto_push
        self._review_enabled = review_enabled

        if not self._phase_dir.is_dir():
            print(f"ERROR: {self._phase_dir} not found")
            sys.exit(1)

        self._index_file = self._phase_dir / "index.json"
        if not self._index_file.exists():
            print(f"ERROR: {self._index_file} not found")
            sys.exit(1)

        idx = self._read_json(self._index_file)
        self._project = idx.get("project", "project")
        self._phase_name = idx.get("phase", phase_dir_name)
        self._total = len(idx["steps"])

    def run(self):
        self._print_header()
        self._check_blockers()
        self._checkout_branch()
        guardrails = self._load_guardrails()
        self._ensure_created_at()
        self._execute_all_steps(guardrails)
        self._finalize()

    # --- timestamps ---

    def _stamp(self) -> str:
        return datetime.now(self.TZ).strftime("%Y-%m-%dT%H:%M:%S%z")

    # --- JSON I/O ---

    @staticmethod
    def _read_json(p: Path) -> dict:
        return json.loads(p.read_text(encoding="utf-8"))

    @staticmethod
    def _write_json(p: Path, data: dict):
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # --- git ---

    def _run_git(self, *args) -> subprocess.CompletedProcess:
        cmd = ["git"] + list(args)
        return subprocess.run(cmd, cwd=self._root, capture_output=True, text=True)

    def _checkout_branch(self):
        branch = f"feat-{self._phase_name}"

        r = self._run_git("rev-parse", "--abbrev-ref", "HEAD")
        if r.returncode != 0:
            print(f"  ERROR: git을 사용할 수 없거나 git repo가 아닙니다.")
            print(f"  {r.stderr.strip()}")
            sys.exit(1)

        if r.stdout.strip() == branch:
            return

        r = self._run_git("rev-parse", "--verify", branch)
        r = self._run_git("checkout", branch) if r.returncode == 0 else self._run_git("checkout", "-b", branch)

        if r.returncode != 0:
            print(f"  ERROR: 브랜치 '{branch}' checkout 실패.")
            print(f"  {r.stderr.strip()}")
            print(f"  Hint: 변경사항을 stash하거나 commit한 후 다시 시도하세요.")
            sys.exit(1)

        print(f"  Branch: {branch}")

    def _commit_step(self, step_num: int, step_name: str):
        output_rel = f"phases/{self._phase_dir_name}/step{step_num}-output.json"
        index_rel = f"phases/{self._phase_dir_name}/index.json"

        self._run_git("add", "-A")
        self._run_git("reset", "HEAD", "--", output_rel)
        self._run_git("reset", "HEAD", "--", index_rel)

        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = self.FEAT_MSG.format(phase=self._phase_name, num=step_num, name=step_name)
            r = self._run_git("commit", "-m", msg)
            if r.returncode == 0:
                print(f"  Commit: {msg}")
            else:
                print(f"  WARN: 코드 커밋 실패: {r.stderr.strip()}")

        self._run_git("add", "-A")
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = self.CHORE_MSG.format(phase=self._phase_name, num=step_num)
            r = self._run_git("commit", "-m", msg)
            if r.returncode != 0:
                print(f"  WARN: housekeeping 커밋 실패: {r.stderr.strip()}")

    # --- top-level index ---

    def _update_top_index(self, status: str):
        if not self._top_index_file.exists():
            return
        top = self._read_json(self._top_index_file)
        ts = self._stamp()
        for phase in top.get("phases", []):
            if phase.get("dir") == self._phase_dir_name:
                phase["status"] = status
                ts_key = {"completed": "completed_at", "error": "failed_at", "blocked": "blocked_at"}.get(status)
                if ts_key:
                    phase[ts_key] = ts
                break
        self._write_json(self._top_index_file, top)

    # --- guardrails & context ---

    def _load_guardrails(self) -> str:
        sections = []
        claude_md = ROOT / "CLAUDE.md"
        if claude_md.exists():
            sections.append(f"## 프로젝트 규칙 (CLAUDE.md)\n\n{claude_md.read_text()}")
        docs_dir = ROOT / "docs"
        if docs_dir.is_dir():
            for doc in sorted(docs_dir.glob("*.md")):
                sections.append(f"## {doc.stem}\n\n{doc.read_text()}")
        return "\n\n---\n\n".join(sections) if sections else ""

    @staticmethod
    def _build_step_context(index: dict) -> str:
        lines = [
            f"- Step {s['step']} ({s['name']}): {s['summary']}"
            for s in index["steps"]
            if s["status"] == "completed" and s.get("summary")
        ]
        if not lines:
            return ""
        return "## 이전 Step 산출물\n\n" + "\n".join(lines) + "\n\n"

    def _build_preamble(self, guardrails: str, step_context: str,
                        prev_error: Optional[str] = None) -> str:
        commit_example = self.FEAT_MSG.format(
            phase=self._phase_name, num="N", name="<step-name>"
        )
        retry_section = ""
        if prev_error:
            retry_section = (
                f"\n## ⚠ 이전 시도 실패 — 아래 에러를 반드시 참고하여 수정하라\n\n"
                f"{prev_error}\n\n---\n\n"
            )
        return (
            f"당신은 {self._project} 프로젝트의 개발자입니다. 아래 step을 수행하세요.\n\n"
            f"{guardrails}\n\n---\n\n"
            f"{step_context}{retry_section}"
            f"## 작업 규칙\n\n"
            f"1. 이전 step에서 작성된 코드를 확인하고 일관성을 유지하라.\n"
            f"2. 이 step에 명시된 작업만 수행하라. 추가 기능이나 파일을 만들지 마라.\n"
            f"3. 기존 테스트를 깨뜨리지 마라.\n"
            f"4. AC(Acceptance Criteria) 검증을 직접 실행하라.\n"
            f"5. /phases/{self._phase_dir_name}/index.json의 해당 step status를 업데이트하라:\n"
            f"   - AC 통과 → \"completed\" + \"summary\" 필드에 이 step의 산출물을 한 줄로 요약\n"
            f"   - {self.MAX_RETRIES}회 수정 시도 후에도 실패 → \"error\" + \"error_message\" 기록\n"
            f"   - 사용자 개입이 필요한 경우 (API 키, 인증, 수동 설정 등) → \"blocked\" + \"blocked_reason\" 기록 후 즉시 중단\n"
            f"6. 모든 변경사항을 커밋하라:\n"
            f"   {commit_example}\n\n---\n\n"
        )

    # --- Claude 호출 ---

    def _invoke_claude(self, step: dict, preamble: str) -> dict:
        step_num, step_name = step["step"], step["name"]
        step_file = self._phase_dir / f"step{step_num}.md"

        if not step_file.exists():
            print(f"  ERROR: {step_file} not found")
            sys.exit(1)

        prompt = preamble + step_file.read_text()
        result = subprocess.run(
            ["claude", "-p", "--dangerously-skip-permissions", "--output-format", "json", prompt],
            cwd=self._root, capture_output=True, text=True, timeout=1800,
        )

        if result.returncode != 0:
            print(f"\n  WARN: Claude가 비정상 종료됨 (code {result.returncode})")
            if result.stderr:
                print(f"  stderr: {result.stderr[:500]}")

        output = {
            "step": step_num, "name": step_name,
            "exitCode": result.returncode,
            "stdout": result.stdout, "stderr": result.stderr,
        }
        out_path = self._phase_dir / f"step{step_num}-output.json"
        with open(out_path, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        return output

    # --- codex 리뷰 게이트 ---

    def _codex_available(self) -> bool:
        """codex 실행 파일이 PATH에 있는지 확인한다. 없으면 리뷰를 건너뛴다."""
        return shutil.which("codex") is not None

    def _write_review_schema(self) -> Path:
        """codex --output-schema 로 넘길 JSON Schema 파일을 phase 디렉토리에 쓰고 경로를 반환한다."""
        schema = {
            "type": "object",
            "properties": {
                "approved": {"type": "boolean"},
                "blocking_issues": {"type": "array", "items": {"type": "string"}},
                "summary": {"type": "string"},
            },
            "required": ["approved", "blocking_issues", "summary"],
            "additionalProperties": False,
        }
        schema_path = self._phase_dir / "review-schema.json"
        self._write_json(schema_path, schema)
        return schema_path

    @staticmethod
    def _parse_review_verdict(raw: str) -> dict:
        """
        codex 마지막 메시지 문자열에서 verdict 객체를 추출한다.
        반환: {"approved": bool, "blocking_issues": list[str], "summary": str}

        규칙(순서대로 시도):
        1. raw 전체를 json.loads 시도.
        2. 실패하면 마지막 '{' ... '}' 균형 블록을 찾아 json.loads 시도.
        3. 그래도 실패하면 보수적으로 거부 verdict를 반환한다.
        파싱된 객체에 키가 빠져 있으면 안전한 기본값으로 채운다
        (approved 누락 → False, blocking_issues 누락 → [], summary 누락 → "").
        """
        reject = {
            "approved": False,
            "blocking_issues": ["codex verdict 파싱 실패"],
            "summary": (raw or "")[:500],
        }

        def _normalize(obj):
            if not isinstance(obj, dict):
                return None
            approved = obj.get("approved", False)
            issues = obj.get("blocking_issues", [])
            summary = obj.get("summary", "")
            return {
                "approved": approved is True,
                "blocking_issues": list(issues) if isinstance(issues, list) else [],
                "summary": summary if isinstance(summary, str) else str(summary),
            }

        if not raw or not raw.strip():
            return reject

        # 1. 전체 파싱
        try:
            parsed = _normalize(json.loads(raw))
            if parsed is not None:
                return parsed
        except (ValueError, TypeError):
            pass

        # 2. 마지막 균형 '{' ... '}' 블록 추출
        block = StepExecutor._extract_last_json_block(raw)
        if block is not None:
            try:
                parsed = _normalize(json.loads(block))
                if parsed is not None:
                    return parsed
            except (ValueError, TypeError):
                pass

        # 3. 보수적 거부
        return reject

    @staticmethod
    def _extract_last_json_block(raw: str) -> Optional[str]:
        """raw 안에서 가장 마지막으로 등장하는 균형 잡힌 { ... } 블록 문자열을 반환한다."""
        end = raw.rfind("}")
        while end != -1:
            depth = 0
            for i in range(end, -1, -1):
                ch = raw[i]
                if ch == "}":
                    depth += 1
                elif ch == "{":
                    depth -= 1
                    if depth == 0:
                        return raw[i:end + 1]
            end = raw.rfind("}", 0, end)
        return None

    def _run_codex_review(self, step_num: int, step_name: str) -> dict:
        """
        현재 워킹트리의 staged+unstaged+untracked 변경을 codex로 리뷰한다.
        반환: _parse_review_verdict 와 동일 형태의 dict.
        """
        if not self._codex_available():
            return {
                "approved": True,
                "blocking_issues": [],
                "summary": "codex 미설치 — 리뷰 건너뜀",
            }

        schema_path = self._write_review_schema()
        raw_path = self._phase_dir / f"step{step_num}-review-raw.txt"
        verdict_path = self._phase_dir / f"step{step_num}-review.json"

        diff = self._run_git("diff", "HEAD")
        untracked = self._run_git("ls-files", "--others", "--exclude-standard")
        diff_text = diff.stdout if diff.returncode == 0 else ""
        untracked_text = untracked.stdout if untracked.returncode == 0 else ""

        prompt = self._build_review_prompt(step_num, step_name, diff_text, untracked_text)

        cmd = [
            "codex", "exec",
            "-s", "read-only",
            "--skip-git-repo-check",
            "-C", self._root,
            "--output-schema", str(schema_path),
            "-o", str(raw_path),
            "--color", "never",
            prompt,
        ]

        try:
            result = subprocess.run(
                cmd, cwd=self._root, capture_output=True, text=True,
                timeout=self.REVIEW_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            verdict = {
                "approved": False,
                "blocking_issues": [f"codex 리뷰 타임아웃 ({self.REVIEW_TIMEOUT}s)"],
                "summary": "codex exec timeout",
            }
            self._write_json(verdict_path, verdict)
            return verdict

        if result.returncode != 0:
            verdict = {
                "approved": False,
                "blocking_issues": [
                    f"codex 비정상 종료 (code {result.returncode}): {(result.stderr or '').strip()[:300]}"
                ],
                "summary": "codex exec failed",
            }
            self._write_json(verdict_path, verdict)
            return verdict

        try:
            raw = raw_path.read_text(encoding="utf-8")
        except OSError:
            raw = result.stdout or ""

        verdict = self._parse_review_verdict(raw)
        self._write_json(verdict_path, verdict)
        return verdict

    @staticmethod
    def _review_gate_decision(approved: bool, review_round: int, max_rounds: int) -> str:
        """
        codex 리뷰 verdict와 누적 거부 횟수로 다음 행동을 결정하는 순수 함수.

        반환:
          - "commit": 승인됨 → 커밋 진행.
          - "rerun":  거부됐고 라운드 예산이 남음 → step 재실행.
          - "error":  거부됐고 라운드 예산 소진 → error 전이.

        review_round 는 '이번 거부를 포함한' 누적 거부 횟수다.
        approved=True 면 라운드와 무관하게 항상 커밋한다.
        """
        if approved:
            return "commit"
        if review_round <= max_rounds:
            return "rerun"
        return "error"

    def _build_review_prompt(self, step_num: int, step_name: str,
                             diff_text: str, untracked_text: str) -> str:
        return (
            f"당신은 PadCode(Next.js 15 App Router + Tone.js 기반 DSL 런치패드) 프로젝트의 코드 리뷰어입니다.\n\n"
            f"## 프로젝트 CRITICAL 규칙 요약 (CLAUDE.md)\n"
            f"- Web Audio를 쓰는 컴포넌트/훅에는 `\"use client\"`가 필요하다.\n"
            f"- `compile()`은 DSL 코드를 `new Function`으로 평가한다. DSL 입력 검증/보안 경계를 바꾸면\n"
            f"  아키텍처 문서의 DSL 섹션도 함께 갱신해야 한다.\n"
            f"- `Tone.start()`는 사용자 제스처 이후 호출되어야 하므로 `ensureAudioContext()` 흐름을 유지해야 한다.\n"
            f"- CodeMirror에 포커스가 있을 때는 패드 키보드 트리거가 비활성화되어야 한다.\n\n"
            f"## 리뷰 대상\n"
            f"Step {step_num} ({step_name})의 변경사항만 리뷰하라.\n"
            f"빌드 깨짐, 명백한 버그, 보안 문제, 설계 의도 위반이 있으면 `approved: false` 와\n"
            f"`blocking_issues` 에 구체적 항목을 담아라. 사소한 스타일 취향은 blocking으로 올리지 마라.\n\n"
            f"## git diff HEAD\n```diff\n{diff_text}\n```\n\n"
            f"## untracked 파일 목록\n```\n{untracked_text}\n```\n\n"
            f"필요하면 워킹트리의 파일을 직접 읽어 변경 맥락을 확인하라.\n"
            f"반드시 output-schema 형태의 JSON 객체로만 최종 응답하라.\n"
        )

    # --- 헤더 & 검증 ---

    def _print_header(self):
        print(f"\n{'='*60}")
        print(f"  Harness Step Executor")
        print(f"  Phase: {self._phase_name} | Steps: {self._total}")
        if self._auto_push:
            print(f"  Auto-push: enabled")
        if not self._review_enabled:
            print(f"  Codex review: disabled")
        elif self._codex_available():
            print(f"  Codex review: enabled (max {self.MAX_REVIEW_ROUNDS} rounds)")
        else:
            print(f"  Codex review: enabled (codex 미발견 — 런타임 skip)")
        print(f"{'='*60}")

    def _check_blockers(self):
        index = self._read_json(self._index_file)
        for s in reversed(index["steps"]):
            if s["status"] == "error":
                print(f"\n  ✗ Step {s['step']} ({s['name']}) failed.")
                print(f"  Error: {s.get('error_message', 'unknown')}")
                print(f"  Fix and reset status to 'pending' to retry.")
                sys.exit(1)
            if s["status"] == "blocked":
                print(f"\n  ⏸ Step {s['step']} ({s['name']}) blocked.")
                print(f"  Reason: {s.get('blocked_reason', 'unknown')}")
                print(f"  Resolve and reset status to 'pending' to retry.")
                sys.exit(2)
            if s["status"] != "pending":
                break

    def _ensure_created_at(self):
        index = self._read_json(self._index_file)
        if "created_at" not in index:
            index["created_at"] = self._stamp()
            self._write_json(self._index_file, index)

    # --- 실행 루프 ---

    def _execute_single_step(self, step: dict, guardrails: str) -> bool:
        """
        단일 step 실행. 완료되면 True (실패/차단 시 내부에서 sys.exit).

        두 개의 독립 카운터로 동작한다:
          - AC 재시도(MAX_RETRIES): _run_ac_attempts 내부에서 소진.
          - codex 리뷰 라운드(MAX_REVIEW_ROUNDS): 이 메서드의 바깥 루프에서 소진.

        한 step이 통과하려면 AC 통과 '그리고' codex approved 둘 다 만족해야 한다.
        """
        step_num, step_name = step["step"], step["name"]
        review_round = 0
        review_feedback = None  # codex 거부 피드백을 다음 재실행 preamble로 전달

        while True:
            # AC 재시도 사이클 — AC 통과 시 elapsed(초) 반환, 실패/차단이면 내부에서 sys.exit.
            elapsed = self._run_ac_attempts(step, guardrails, review_feedback)

            # 리뷰 비활성화 → 게이트 건너뛰고 기존대로 커밋.
            if not self._review_enabled:
                self._commit_step(step_num, step_name)
                print(f"  ✓ Step {step_num}: {step_name} [{elapsed}s]")
                return True

            verdict = self._run_codex_review(step_num, step_name)
            decision = self._review_gate_decision(
                verdict["approved"], review_round + 1, self.MAX_REVIEW_ROUNDS
            )

            if decision == "commit":
                self._commit_step(step_num, step_name)
                print(f"  ✓ Step {step_num}: {step_name} [{elapsed}s]")
                return True

            # 여기부터는 codex 거부. 절대 커밋하지 않는다.
            review_round += 1
            issues = verdict.get("blocking_issues") or ["(구체적 지적 없음)"]

            if decision == "rerun":
                index = self._read_json(self._index_file)
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["status"] = "pending"
                        s.pop("error_message", None)
                        s.pop("completed_at", None)
                self._write_json(self._index_file, index)
                review_feedback = "[codex 리뷰 지적]\n" + "\n".join(issues)
                print(f"  ⟳ Step {step_num}: codex 리뷰 거부 — 재실행 {review_round}/{self.MAX_REVIEW_ROUNDS}")
                for issue in issues:
                    print(f"      • {issue}")
                continue

            # decision == "error": 리뷰 라운드 예산 소진.
            ts = self._stamp()
            index = self._read_json(self._index_file)
            for s in index["steps"]:
                if s["step"] == step_num:
                    s["status"] = "error"
                    s["error_message"] = (
                        f"codex 리뷰 {self.MAX_REVIEW_ROUNDS}회 거부: {'; '.join(issues)}"
                    )
                    s["failed_at"] = ts
            self._write_json(self._index_file, index)
            self._commit_step(step_num, step_name)
            print(f"  ✗ Step {step_num}: {step_name} codex 리뷰 {self.MAX_REVIEW_ROUNDS}회 거부")
            print(f"    Issues: {'; '.join(issues)}")
            self._update_top_index("error")
            sys.exit(1)

    def _run_ac_attempts(self, step: dict, guardrails: str,
                         initial_feedback: Optional[str]) -> int:
        """
        AC 재시도 루프. AC 통과 시 elapsed(초)를 반환한다(커밋하지 않음).
        blocked → sys.exit(2). MAX_RETRIES 소진 → status error, 커밋, sys.exit(1).

        initial_feedback 가 주어지면(codex 리뷰 거부 재실행) 첫 시도 preamble의
        prev_error 로 주입되어 AC 실패 피드백과 동일 경로로 전달된다.
        """
        step_num, step_name = step["step"], step["name"]
        done = sum(1 for s in self._read_json(self._index_file)["steps"] if s["status"] == "completed")
        prev_error = initial_feedback

        for attempt in range(1, self.MAX_RETRIES + 1):
            index = self._read_json(self._index_file)
            step_context = self._build_step_context(index)
            preamble = self._build_preamble(guardrails, step_context, prev_error)

            tag = f"Step {step_num}/{self._total - 1} ({done} done): {step_name}"
            if attempt > 1:
                tag += f" [retry {attempt}/{self.MAX_RETRIES}]"
            elif initial_feedback:
                tag += " [codex 재실행]"

            with progress_indicator(tag) as pi:
                self._invoke_claude(step, preamble)
                elapsed = int(pi.elapsed)

            index = self._read_json(self._index_file)
            status = next((s.get("status", "pending") for s in index["steps"] if s["step"] == step_num), "pending")
            ts = self._stamp()

            if status == "completed":
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["completed_at"] = ts
                self._write_json(self._index_file, index)
                return elapsed

            if status == "blocked":
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["blocked_at"] = ts
                self._write_json(self._index_file, index)
                reason = next((s.get("blocked_reason", "") for s in index["steps"] if s["step"] == step_num), "")
                print(f"  ⏸ Step {step_num}: {step_name} blocked [{elapsed}s]")
                print(f"    Reason: {reason}")
                self._update_top_index("blocked")
                sys.exit(2)

            err_msg = next(
                (s.get("error_message", "Step did not update status") for s in index["steps"] if s["step"] == step_num),
                "Step did not update status",
            )

            if attempt < self.MAX_RETRIES:
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["status"] = "pending"
                        s.pop("error_message", None)
                self._write_json(self._index_file, index)
                prev_error = err_msg
                print(f"  ↻ Step {step_num}: retry {attempt}/{self.MAX_RETRIES} — {err_msg}")
            else:
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["status"] = "error"
                        s["error_message"] = f"[{self.MAX_RETRIES}회 시도 후 실패] {err_msg}"
                        s["failed_at"] = ts
                self._write_json(self._index_file, index)
                self._commit_step(step_num, step_name)
                print(f"  ✗ Step {step_num}: {step_name} failed after {self.MAX_RETRIES} attempts [{elapsed}s]")
                print(f"    Error: {err_msg}")
                self._update_top_index("error")
                sys.exit(1)

        return 0  # unreachable

    def _execute_all_steps(self, guardrails: str):
        while True:
            index = self._read_json(self._index_file)
            pending = next((s for s in index["steps"] if s["status"] == "pending"), None)
            if pending is None:
                print("\n  All steps completed!")
                return

            step_num = pending["step"]
            for s in index["steps"]:
                if s["step"] == step_num and "started_at" not in s:
                    s["started_at"] = self._stamp()
                    self._write_json(self._index_file, index)
                    break

            self._execute_single_step(pending, guardrails)

    def _finalize(self):
        index = self._read_json(self._index_file)
        index["completed_at"] = self._stamp()
        self._write_json(self._index_file, index)
        self._update_top_index("completed")

        self._run_git("add", "-A")
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = f"chore({self._phase_name}): mark phase completed"
            r = self._run_git("commit", "-m", msg)
            if r.returncode == 0:
                print(f"  ✓ {msg}")

        if self._auto_push:
            branch = f"feat-{self._phase_name}"
            r = self._run_git("push", "-u", "origin", branch)
            if r.returncode != 0:
                print(f"\n  ERROR: git push 실패: {r.stderr.strip()}")
                sys.exit(1)
            print(f"  ✓ Pushed to origin/{branch}")

        print(f"\n{'='*60}")
        print(f"  Phase '{self._phase_name}' completed!")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Harness Step Executor")
    parser.add_argument("phase_dir", help="Phase directory name (e.g. 0-mvp)")
    parser.add_argument("--push", action="store_true", help="Push branch after completion")
    parser.add_argument("--no-review", action="store_true",
                        help="커밋 전 codex 리뷰 게이트를 비활성화한다")
    args = parser.parse_args()

    StepExecutor(args.phase_dir, auto_push=args.push,
                 review_enabled=not args.no_review).run()


if __name__ == "__main__":
    main()