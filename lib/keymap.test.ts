import { describe, expect, it } from "vitest";
import { cellId, eventToCellId, keyToCellId, KEYMAP_4X4 } from "@/lib/keymap";

// step0 스모크 단정을 유지하면서 step2에서 본격 케이스로 확장한다.
describe("keymap smoke", () => {
  it("cellId(0, 0) === 'r0c0'", () => {
    expect(cellId(0, 0)).toBe("r0c0");
  });

  it("cellId(3, 3) === 'r3c3'", () => {
    expect(cellId(3, 3)).toBe("r3c3");
  });
});

describe("cellId", () => {
  it("r{row}c{col} 형식을 만든다", () => {
    expect(cellId(0, 0)).toBe("r0c0");
    expect(cellId(1, 2)).toBe("r1c2");
    expect(cellId(3, 3)).toBe("r3c3");
  });
});

// 키 → 기대 셀 ID 매핑표 (1234/QWER/ASDF/ZXCV → r{row}c{col})
const KEY_EXPECTATIONS: Array<[string, string]> = [
  ["1", "r0c0"],
  ["2", "r0c1"],
  ["3", "r0c2"],
  ["4", "r0c3"],
  ["q", "r1c0"],
  ["w", "r1c1"],
  ["e", "r1c2"],
  ["r", "r1c3"],
  ["a", "r2c0"],
  ["s", "r2c1"],
  ["d", "r2c2"],
  ["f", "r2c3"],
  ["z", "r3c0"],
  ["x", "r3c1"],
  ["c", "r3c2"],
  ["v", "r3c3"],
];

describe("keyToCellId", () => {
  it.each(KEY_EXPECTATIONS)("'%s' → %s", (key, cell) => {
    expect(keyToCellId(key)).toBe(cell);
  });

  it("대소문자를 구분하지 않는다", () => {
    for (const [key, cell] of KEY_EXPECTATIONS) {
      expect(keyToCellId(key.toUpperCase())).toBe(cell);
      expect(keyToCellId(key.toLowerCase())).toBe(cell);
    }
  });

  it("매핑 밖 키는 null", () => {
    expect(keyToCellId("p")).toBeNull();
    expect(keyToCellId("5")).toBeNull();
    expect(keyToCellId("")).toBeNull();
    expect(keyToCellId(" ")).toBeNull();
  });
});

// `KeyboardEvent` 전체를 만들지 않고 eventToCellId가 읽는 필드만 가진 가짜 객체.
function fakeEvent(code: string, key: string): KeyboardEvent {
  return { code, key } as KeyboardEvent;
}

describe("eventToCellId", () => {
  it("물리 코드(code)를 우선 사용한다", () => {
    expect(eventToCellId(fakeEvent("KeyQ", "q"))).toBe("r1c0");
    expect(eventToCellId(fakeEvent("Digit1", "1"))).toBe("r0c0");
    expect(eventToCellId(fakeEvent("KeyV", "v"))).toBe("r3c3");
  });

  it("한글 IME 상태와 무관하게 물리 코드 기준으로 동작한다(IME 독립성)", () => {
    // code는 KeyQ지만 key는 한글 'ㅂ' — 물리 코드가 우선이어야 한다.
    expect(eventToCellId(fakeEvent("KeyQ", "ㅂ"))).toBe("r1c0");
    expect(eventToCellId(fakeEvent("KeyA", "ㅁ"))).toBe("r2c0");
    expect(eventToCellId(fakeEvent("KeyS", "ㄴ"))).toBe("r2c1");
  });

  it("code가 매핑 밖이면 key로 폴백한다", () => {
    // 알 수 없는 code → key.toLowerCase()로 폴백
    expect(eventToCellId(fakeEvent("Unidentified", "Q"))).toBe("r1c0");
    expect(eventToCellId(fakeEvent("", "1"))).toBe("r0c0");
  });

  it("매핑 밖 코드/키는 null", () => {
    expect(eventToCellId(fakeEvent("KeyP", "p"))).toBeNull();
    expect(eventToCellId(fakeEvent("Digit5", "5"))).toBeNull();
    expect(eventToCellId(fakeEvent("Unidentified", "ㅂ"))).toBeNull();
  });
});

describe("KEYMAP_4X4", () => {
  it("4×4 그리드다", () => {
    expect(KEYMAP_4X4).toHaveLength(4);
    for (const row of KEYMAP_4X4) {
      expect(row).toHaveLength(4);
    }
  });
});
