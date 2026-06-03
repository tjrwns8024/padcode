import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "@/stores/ui";

// 모듈 싱글턴 스토어를 각 테스트 전에 초기값으로 되돌린다.
// partial 머지로 데이터 필드만 리셋하고 액션은 보존한다.
beforeEach(() => {
  useUIStore.setState({
    selectedCellId: null,
    pulsingCellId: null,
    mode: "live",
    bpm: 120,
  });
});

describe("selectCell", () => {
  it("셀 id 를 선택한다", () => {
    useUIStore.getState().selectCell("r0c0");
    expect(useUIStore.getState().selectedCellId).toBe("r0c0");
  });

  it("null 로 선택을 해제한다", () => {
    const { selectCell } = useUIStore.getState();
    selectCell("r0c0");
    selectCell(null);
    expect(useUIStore.getState().selectedCellId).toBeNull();
  });
});

describe("setMode", () => {
  it.each(["live", "rec", "play"] as const)('"%s" 모드로 전환한다', (mode) => {
    useUIStore.getState().setMode(mode);
    expect(useUIStore.getState().mode).toBe(mode);
  });
});

describe("setBpm 클램프", () => {
  it("하한 미만은 60 으로 클램프한다", () => {
    useUIStore.getState().setBpm(30);
    expect(useUIStore.getState().bpm).toBe(60);
  });

  it("상한 초과는 200 으로 클램프한다", () => {
    useUIStore.getState().setBpm(500);
    expect(useUIStore.getState().bpm).toBe(200);
  });

  it("범위 내 값은 그대로 둔다", () => {
    useUIStore.getState().setBpm(120);
    expect(useUIStore.getState().bpm).toBe(120);
  });

  it("경계값 60·200 은 그대로 둔다", () => {
    const { setBpm } = useUIStore.getState();
    setBpm(60);
    expect(useUIStore.getState().bpm).toBe(60);
    setBpm(200);
    expect(useUIStore.getState().bpm).toBe(200);
  });
});

describe("pulse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pulsingCellId 를 설정하고 200ms 후 해제한다", () => {
    useUIStore.getState().pulse("r1c2");
    expect(useUIStore.getState().pulsingCellId).toBe("r1c2");

    vi.advanceTimersByTime(199);
    expect(useUIStore.getState().pulsingCellId).toBe("r1c2");

    vi.advanceTimersByTime(1);
    expect(useUIStore.getState().pulsingCellId).toBeNull();
  });

  it("해제 전 다른 셀이 펄스되면 기존 타이머는 그 셀을 지우지 않는다", () => {
    const { pulse } = useUIStore.getState();
    pulse("r0c0");
    vi.advanceTimersByTime(100);
    pulse("r0c1");
    expect(useUIStore.getState().pulsingCellId).toBe("r0c1");

    // 첫 타이머(r0c0)가 만료돼도 현재 펄스(r0c1)는 유지된다.
    vi.advanceTimersByTime(100);
    expect(useUIStore.getState().pulsingCellId).toBe("r0c1");

    // 두 번째 타이머가 만료되면 해제된다.
    vi.advanceTimersByTime(100);
    expect(useUIStore.getState().pulsingCellId).toBeNull();
  });
});
