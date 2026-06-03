// 전역 테스트 setup.
//
// 이 phase의 다음 step들이 `vi.mock("tone")` / `vi.mock("@/lib/audio/master")`
// 로 오디오 모듈을 모킹하므로, 여기서는 jsdom에 없는 브라우저 API의
// 최소 스텁만 둔다. 과한 전역 모킹은 의도적으로 피한다.
