# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 짧은 가이드입니다. 사용자용 문서는 `/docs` 아래 문서를 기준으로 합니다.

## 명령어

```bash
npm run dev      # localhost:3000 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

현재 별도 테스트 스위트는 없습니다. 동작 검증은 개발 서버 실행 후 브라우저에서 확인하는 방식이 기본입니다.

## 작업 기준

- 프로젝트는 Next.js 15 App Router 기반의 브라우저 중심 앱입니다.
- Web Audio를 쓰는 컴포넌트와 훅에는 `"use client"`가 필요합니다.
- 아키텍처 세부 사항은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 기준으로 확인합니다.
- DSL 명세는 [docs/DSL.md](docs/DSL.md)를 기준으로 확인합니다.
- 구현 상태와 미구현 항목은 [docs/ROADMAP.md](docs/ROADMAP.md)를 기준으로 확인합니다.

## 주의할 점

- `compile()`은 DSL 코드를 `new Function`으로 평가합니다. DSL 입력 검증이나 보안 경계를 바꿀 때는 아키텍처 문서의 DSL 섹션을 함께 갱신해야 합니다.
- `Tone.start()`는 사용자 제스처 이후 호출되어야 하므로, 오디오 재생 전 `ensureAudioContext()` 흐름을 유지해야 합니다.
- CodeMirror에 포커스가 있을 때는 패드 키보드 트리거가 비활성화되어야 합니다.
