# PADCODE

브라우저에서 동작하는 프로그래머블 런치패드입니다. 4×4 패드에 한글/영어 DSL 코드를 넣어 사운드를 만들고, 키보드로 실시간 연주하며, 녹음과 시각화를 함께 제공합니다.

## 빠른 시작

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

AI 사운드 생성 기능을 쓰려면 `.env.local` 또는 `.env`에 `GEMINI_API_KEY`를 설정해야 합니다. AI 기능을 쓰지 않는 경우에는 API 키 없이도 패드, DSL, 샘플 업로드, 녹음 기능을 사용할 수 있습니다.

## 문서

상세 문서는 `/docs` 아래에 나누어 정리되어 있습니다.

- [문서 색인](docs/README.md)
- [실행과 개발 환경](docs/GETTING_STARTED.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [DSL 레퍼런스](docs/DSL.md)
- [상호작용과 키보드 매핑](docs/INTERACTION.md)
- [AI 사운드 생성](docs/AI_SOUND_GENERATION.md)
- [기획 맥락](docs/PROJECT_CONTEXT.md)
- [로드맵과 구현 상태](docs/ROADMAP.md)

## 현재 상태

구현된 주요 기능은 4×4 패드 그리드, 키보드 트리거, 한글/영어 DSL, CodeMirror 에디터, 프리셋 사이드바, 사용자 샘플 업로드, 하단 FFT 비주얼라이저, WebM 녹음, Gemini 기반 AI 사운드 생성입니다.
