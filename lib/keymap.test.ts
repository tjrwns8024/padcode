import { describe, expect, it } from "vitest";
import { cellId } from "@/lib/keymap";

// 스모크 테스트: `@` 별칭 해석 + Vitest 러너 동작을 동시에 검증한다.
// keymap의 본격 테스트는 step2에서 확장한다.
describe("keymap smoke", () => {
  it("cellId(0, 0) === 'r0c0'", () => {
    expect(cellId(0, 0)).toBe("r0c0");
  });

  it("cellId(3, 3) === 'r3c3'", () => {
    expect(cellId(3, 3)).toBe("r3c3");
  });
});
