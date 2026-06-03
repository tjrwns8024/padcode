#!/usr/bin/env python3
"""
StepExecutor._parse_review_verdict 단위 검증 (표준 라이브러리만 사용).

실행:
    python3 scripts/test_execute.py
모두 통과하면 "OK" 출력 후 exit 0, 실패면 exit 1.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from execute import StepExecutor

parse = StepExecutor._parse_review_verdict


def test_pure_json():
    raw = '{"approved": true, "blocking_issues": [], "summary": "good"}'
    v = parse(raw)
    assert v["approved"] is True, v
    assert v["blocking_issues"] == [], v
    assert v["summary"] == "good", v


def test_json_with_surrounding_text():
    raw = (
        "Here is my review of the changes.\n"
        '{"approved": false, "blocking_issues": ["bug in foo"], "summary": "needs work"}\n'
        "Thanks for reading."
    )
    v = parse(raw)
    assert v["approved"] is False, v
    assert v["blocking_issues"] == ["bug in foo"], v
    assert v["summary"] == "needs work", v


def test_broken_string_rejects():
    raw = "this is not json at all {{{ broken"
    v = parse(raw)
    assert v["approved"] is False, v
    assert isinstance(v["blocking_issues"], list), v
    assert v["blocking_issues"], v  # 사유가 비어있지 않아야 함


def test_empty_string_rejects():
    v = parse("")
    assert v["approved"] is False, v
    assert isinstance(v["blocking_issues"], list), v


def test_missing_keys_default_safely():
    # approved 누락 → False, 나머지 기본값
    raw = '{"summary": "partial verdict"}'
    v = parse(raw)
    assert v["approved"] is False, v
    assert v["blocking_issues"] == [], v
    assert v["summary"] == "partial verdict", v


def test_missing_approved_only():
    raw = '{"blocking_issues": ["x"], "summary": "s"}'
    v = parse(raw)
    assert v["approved"] is False, v
    assert v["blocking_issues"] == ["x"], v


def test_approved_must_be_strict_true():
    # approved 가 문자열 "true" 처럼 모호하면 절대 통과시키지 않는다
    raw = '{"approved": "true", "blocking_issues": [], "summary": "s"}'
    v = parse(raw)
    assert v["approved"] is False, v


def test_last_block_wins():
    raw = (
        '{"approved": true, "blocking_issues": [], "summary": "first"} '
        'and then the real verdict: '
        '{"approved": false, "blocking_issues": ["real"], "summary": "second"}'
    )
    v = parse(raw)
    assert v["approved"] is False, v
    assert v["summary"] == "second", v


def main():
    tests = [
        test_pure_json,
        test_json_with_surrounding_text,
        test_broken_string_rejects,
        test_empty_string_rejects,
        test_missing_keys_default_safely,
        test_missing_approved_only,
        test_approved_must_be_strict_true,
        test_last_block_wins,
    ]
    failures = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {t.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            failures += 1
            print(f"ERROR: {t.__name__}: {type(e).__name__}: {e}")
    if failures:
        print(f"{failures} test(s) failed")
        sys.exit(1)
    print("OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
