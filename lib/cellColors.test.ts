import { describe, expect, it } from "vitest";
import { colorFor, inferColorFromCode, type PadColor } from "@/lib/cellColors";

// inferColorFromCode 의 매칭 규칙은 lib/cellColors.ts 구현을 그대로 따른다(추측 금지):
//   1. !code.trim()                                     → "empty"
//   2. '"kick"' | "'kick'"                              → "kick"
//   3. '"snare"' | "'snare'" | '"clap"'                 → "snare"
//   4. '"hat"' | "'hat'" | "hihat"                      → "hat"
//   5. "bass"                                           → "bass"
//   6. "사인파" | "sin("                                → "synth"
//   7. 그 외                                            → "fx"
// (전부 lower-case 후 검사. clap 은 큰따옴표만 매칭.)
describe("inferColorFromCode", () => {
  it("빈 문자열/공백 → 'empty'", () => {
    expect(inferColorFromCode("")).toBe("empty");
    expect(inferColorFromCode("   ")).toBe("empty");
    expect(inferColorFromCode("\n\t ")).toBe("empty");
  });

  it("kick 샘플 → 'kick'", () => {
    expect(inferColorFromCode('샘플("kick").게인(1)')).toBe("kick");
    expect(inferColorFromCode("sample('kick')")).toBe("kick");
  });

  it("snare/clap 샘플 → 'snare'", () => {
    expect(inferColorFromCode('샘플("snare").게인(0.8)')).toBe("snare");
    expect(inferColorFromCode("sample('snare')")).toBe("snare");
    expect(inferColorFromCode('샘플("clap")')).toBe("snare");
  });

  it("hat/hihat 샘플 → 'hat'", () => {
    expect(inferColorFromCode('샘플("hat").게인(0.5)')).toBe("hat");
    expect(inferColorFromCode("sample('hat')")).toBe("hat");
    expect(inferColorFromCode('샘플("hihat")')).toBe("hat");
  });

  it("bass 포함 → 'bass'", () => {
    expect(inferColorFromCode("베이스(80).게인(0.8)")).toBe("fx"); // 한글 '베이스'는 bass 문자열 아님
    expect(inferColorFromCode("bass(80).gain(0.8)")).toBe("bass");
  });

  it("사인파/sin( → 'synth'", () => {
    expect(inferColorFromCode("사인파(440).게인(0.5)")).toBe("synth");
    expect(inferColorFromCode("sin(440).gain(0.5)")).toBe("synth");
  });

  it("그 외 DSL → 'fx'", () => {
    expect(inferColorFromCode("노이즈().게인(0.2)")).toBe("fx");
    expect(inferColorFromCode("플럭(330)")).toBe("fx");
    expect(inferColorFromCode("피아노(440)")).toBe("fx");
  });

  it("clap 은 큰따옴표만 매칭한다(작은따옴표는 fx)", () => {
    expect(inferColorFromCode("sample('clap')")).toBe("fx");
  });

  it("우선순위: kick 이 다른 키워드보다 먼저 매칭된다", () => {
    // bass 문자열을 포함해도 kick 분기가 먼저라 'kick'
    expect(inferColorFromCode('샘플("kick").bass')).toBe("kick");
  });
});

describe("colorFor", () => {
  const EXPECTED: Record<PadColor, string | null> = {
    kick: "#ff2020",
    snare: "#ffb8de",
    hat: "#00ffe9",
    bass: "#ff9b1a",
    synth: "#ffe900",
    fx: "#ffffff",
    empty: null,
  };

  it.each(Object.entries(EXPECTED))("colorFor('%s') === %s", (pad, css) => {
    expect(colorFor(pad as PadColor)).toBe(css);
  });

  it("'empty' 는 null", () => {
    expect(colorFor("empty")).toBeNull();
  });
});
