# 실행과 개발 환경

## 요구 사항

- Node.js
- npm
- 브라우저

프로젝트는 Next.js 15 App Router 기반이며, 오디오 출력은 브라우저의 Web Audio API를 Tone.js로 제어합니다.

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

## 빌드

```bash
npm run build
```

## 린트

```bash
npm run lint
```

현재 별도 테스트 스위트는 없습니다. 기능 검증은 개발 서버를 띄운 뒤 패드 클릭, 키보드 트리거, DSL 에디터, 샘플 업로드, 녹음 기능을 직접 확인하는 방식입니다.

## 환경변수

AI 사운드 생성 기능은 Gemini API 키가 필요합니다.

```bash
GEMINI_API_KEY=...
```

`.env.local` 또는 `.env`에 설정하면 `app/api/generate-sound/route.ts`에서 서버 사이드로 읽습니다. API 키는 클라이언트 컴포넌트로 직접 전달되지 않습니다.

AI 기능을 사용하지 않는다면 `GEMINI_API_KEY` 없이도 다음 기능은 동작합니다.

- 패드 선택과 클릭 트리거
- 키보드 트리거
- 한글/영어 DSL 작성
- 프리셋 삽입
- 사용자 샘플 업로드
- 하단 비주얼라이저
- WebM 녹음

## 주요 npm 스크립트

| 명령어 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |
