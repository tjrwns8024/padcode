import { beforeEach, describe, expect, it } from "vitest";
import { useCellsStore } from "@/stores/cells";

// 모듈 싱글턴 스토어이므로 각 테스트 전에 초기 cells 로 되돌린다.
// 액션은 cells 를 spread 로만 교체하므로 캡처한 초기 객체는 변형되지 않는다.
// setState 는 partial 머지를 써서 액션(setCode 등)을 보존한다.
const initialCells = structuredClone(useCellsStore.getState().cells);

beforeEach(() => {
  useCellsStore.setState({ cells: structuredClone(initialCells) });
});

describe("cells 초기 상태", () => {
  it("16개 셀이 r0c0~r3c3 id 로 존재한다", () => {
    const { cells } = useCellsStore.getState();
    expect(Object.keys(cells)).toHaveLength(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const id = `r${r}c${c}`;
        expect(cells[id]).toBeDefined();
        expect(cells[id].id).toBe(id);
        expect(cells[id].row).toBe(r);
        expect(cells[id].col).toBe(c);
      }
    }
  });

  it("각 셀의 초기값은 빈 코드·oneshot·looping false 다", () => {
    const { cells } = useCellsStore.getState();
    for (const cell of Object.values(cells)) {
      expect(cell.code).toBe("");
      expect(cell.playMode).toBe("oneshot");
      expect(cell.looping).toBe(false);
    }
  });
});

describe("setCode", () => {
  it("해당 셀의 code 를 반영한다", () => {
    useCellsStore.getState().setCode("r0c0", '샘플("kick").게인(1)');
    expect(useCellsStore.getState().cells["r0c0"].code).toBe('샘플("kick").게인(1)');
  });

  it("다른 셀에는 영향을 주지 않는다", () => {
    useCellsStore.getState().setCode("r0c0", "사인파(440)");
    expect(useCellsStore.getState().cells["r0c1"].code).toBe("");
  });
});

describe("clearCode", () => {
  it("코드를 비우고 looping 을 해제한다", () => {
    const { setCode, toggleLoop, clearCode } = useCellsStore.getState();
    setCode("r1c1", "노이즈()");
    toggleLoop("r1c1");
    expect(useCellsStore.getState().cells["r1c1"].looping).toBe(true);

    clearCode("r1c1");
    const cell = useCellsStore.getState().cells["r1c1"];
    expect(cell.code).toBe("");
    expect(cell.looping).toBe(false);
  });
});

describe("setPlayMode", () => {
  it('playMode 를 "loop" 로 바꾼다', () => {
    useCellsStore.getState().setPlayMode("r2c2", "loop");
    expect(useCellsStore.getState().cells["r2c2"].playMode).toBe("loop");
  });

  it('playMode 를 "oneshot" 으로 되돌린다', () => {
    const { setPlayMode } = useCellsStore.getState();
    setPlayMode("r2c2", "loop");
    setPlayMode("r2c2", "oneshot");
    expect(useCellsStore.getState().cells["r2c2"].playMode).toBe("oneshot");
  });
});

describe("toggleLoop", () => {
  it("looping 플래그를 토글한다", () => {
    const { toggleLoop } = useCellsStore.getState();
    expect(useCellsStore.getState().cells["r3c3"].looping).toBe(false);
    toggleLoop("r3c3");
    expect(useCellsStore.getState().cells["r3c3"].looping).toBe(true);
    toggleLoop("r3c3");
    expect(useCellsStore.getState().cells["r3c3"].looping).toBe(false);
  });
});
