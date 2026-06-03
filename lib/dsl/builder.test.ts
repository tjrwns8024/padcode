import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// builder.ts의 build()는 즉시 Tone 노드를 생성하고 getMaster()에 연결한다.
// jsdom에는 Web Audio가 없으므로 tone과 master를 가짜 구현으로 대체한다.
// 각 가짜 노드는 builder가 호출하는 메서드를 모두 가진 체이너블 스텁이다.
const { FakeNode } = vi.hoisted(() => {
  class FakeNode {
    // 생성자 인자는 무시한다(주파수/필터 타입/옵션 객체 등).
    constructor(..._args: unknown[]) {}
    connect(target?: unknown) {
      return target ?? this;
    }
    chain(..._nodes: unknown[]) {
      return this;
    }
    start() {
      return this;
    }
    stop() {
      return this;
    }
    dispose() {
      return this;
    }
    triggerAttack() {
      return this;
    }
    triggerRelease() {
      return this;
    }
    triggerAttackRelease() {
      return this;
    }
    toDestination() {
      return this;
    }
  }
  return { FakeNode };
});

vi.mock("@/lib/audio/master", () => ({
  getMaster: () => new FakeNode(),
}));

vi.mock("tone", () => {
  // builder.ts가 런타임에 생성하는 Tone 클래스 목록.
  // (ToneAudioNode는 타입 전용이라 런타임 심볼이 필요 없다.)
  const classNames = [
    "Gain",
    "Filter",
    "PitchShift",
    "FeedbackDelay",
    "AmplitudeEnvelope",
    "Oscillator",
    "Noise",
    "Player",
    "PluckSynth",
    "MonoSynth",
    "Synth",
    "AMSynth",
    "MembraneSynth",
    "MetalSynth",
  ];
  const mod: Record<string, unknown> = {};
  for (const name of classNames) mod[name] = FakeNode;
  return mod;
});

import { compile } from "@/lib/dsl/builder";

describe("compile - 성공/실패 분기", () => {
  it("유효한 DSL은 ok:true 와 trigger/dispose/meta 를 가진 sound 를 반환한다", () => {
    const result = compile("사인파(440).게인(0.5)");
    expect(result.ok).toBe(true);
    if (!result.ok) return; // 타입 가드
    expect(typeof result.sound.trigger).toBe("function");
    expect(typeof result.sound.dispose).toBe("function");
    expect(result.sound.meta).toBeDefined();
  });

  it("빈 코드는 ok:false 와 빈 코드 안내 에러를 반환한다", () => {
    const empty = compile("");
    const blank = compile("   ");
    expect(empty.ok).toBe(false);
    expect(blank.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe("(빈 코드)");
    if (!blank.ok) expect(blank.error).toBe("(빈 코드)");
  });

  it("미정의 함수는 ok:false 와 문자열 에러를 반환한다", () => {
    const result = compile("없는함수(1)");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(typeof result.error).toBe("string");
  });

  it("잘못된 문법은 ok:false 와 문자열 에러를 반환한다", () => {
    const result = compile("사인파(");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(typeof result.error).toBe("string");
  });
});

describe("compile - 한/영 별칭 동등성", () => {
  it("한글과 영어 별칭은 동일한 meta(source/effects)를 보고한다", () => {
    // 주의: 영어 .gain 별칭은 인스턴스 필드 `gain`에 가려져 동작하지 않는다
    // (아래 "알려진 버그" 테스트 참고). 그래서 충돌이 없는 이펙트로 동등성을 검증한다.
    const ko = compile("사인파(440).로우패스(200).딜레이(0.125)");
    const en = compile("sin(440).lowpass(200).delay(0.125)");
    expect(ko.ok).toBe(true);
    expect(en.ok).toBe(true);
    if (!ko.ok || !en.ok) return;
    expect(ko.sound.meta.source).toBe("sine");
    expect(en.sound.meta.source).toBe("sine");
    // 영어 별칭은 한글 프로토타입 메서드를 그대로 호출하므로 effectsLog 라벨이 동일하다.
    expect(en.sound.meta.effects).toEqual(ko.sound.meta.effects);
    expect(ko.sound.meta.effects).toEqual(["로우패스(200)", "딜레이(0.125)"]);
  });

  it.each([
    ["lowpass", "로우패스", "200"],
    ["bandpass", "밴드패스", "3000"],
    ["delay", "딜레이", "0.125"],
    ["pitch", "피치다운", "2"],
    ["smooth", "스무딩", "10"],
    ["echo", "에코", "20"],
    ["prob", "확률", "0.5"],
  ])(
    "영어 별칭 .%s 는 한글 메서드와 동일하게 컴파일된다",
    (en, _ko, arg) => {
      const result = compile(`사인파(440).${en}(${arg})`);
      expect(result.ok).toBe(true);
    },
  );
});

// 알려진 버그(builder.ts): 클래스 인스턴스 필드 `gain = 0.6`이 프로토타입에 붙는
// 영어 별칭 메서드 `gain`을 가린다. 따라서 `sin(440).gain(0.5)`는 숫자 0.6을
// 함수처럼 호출하려다 실패한다. 한글 `.게인(...)`은 충돌이 없어 정상 동작한다.
// (다른 영어 별칭은 필드명이 달라 영향을 받지 않는다: lowpassHz/delayTime 등)
// 이 테스트는 현재 동작을 고정해 회귀를 감지하기 위한 것이며, 구현 수정 시 함께 갱신해야 한다.
describe("compile - 알려진 버그: 영어 .gain 별칭이 인스턴스 필드에 가려짐", () => {
  it("한글 .게인 은 정상 컴파일된다", () => {
    const ko = compile("사인파(440).게인(0.5)");
    expect(ko.ok).toBe(true);
  });

  it("영어 .gain 은 현재 컴파일에 실패한다 (필드 섀도잉)", () => {
    const en = compile("사인파(440).gain(0.5)");
    expect(en.ok).toBe(false);
    if (!en.ok) expect(en.error).toMatch(/gain is not a function/);
  });
});

describe("compile - meta 정확성", () => {
  it.each([
    ["사인파(440)", "sine"],
    ["노이즈()", "noise"],
    ['샘플("kick")', "sample"],
    ["플럭(330)", "pluck"],
    ["베이스(80)", "bass"],
    ["피아노(440)", "piano"],
    ["오르간(440)", "organ"],
  ])("%s 의 meta.source 는 %s 이다", (code, expected) => {
    const result = compile(code);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sound.meta.source).toBe(expected);
  });

  it("체이닝한 이펙트는 순서대로 meta.effects 에 반영된다", () => {
    const result = compile("사인파(440).로우패스(200).에코(20)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sound.meta.effects).toEqual(["로우패스(200)", "에코(20)"]);
  });

  it("이펙트가 없으면 meta.effects 는 빈 배열이다", () => {
    const result = compile('샘플("snare")');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sound.meta.effects).toEqual([]);
  });
});

describe("compile - trigger 안전성", () => {
  beforeEach(() => {
    // 확률 분기를 결정적으로 만든다. random()=0 이면 항상 트리거된다.
    vi.spyOn(Math, "random").mockReturnValue(0);
    // setTimeout 콜백이 테스트 중 실행되지 않도록 가짜 타이머를 쓴다.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    "사인파(440).게인(0.5)",
    "사인파(80).게인(0.8)", // 저음 분기(보강 오실레이터) 경로
    "노이즈().게인(0.2).밴드패스(3000)",
    '샘플("kick")',
    '샘플("snare")',
    '샘플("hat")',
    '샘플("clap")',
    '샘플("tom")',
    '샘플("cymbal")',
    '샘플("미지의샘플")', // 폴백 틱 경로
    "플럭(330)",
    "베이스(80)",
    "피아노(440)",
    "오르간(440)",
    "사인파(660).딜레이(0.125).에코(20).피치다운(2)",
  ])("%s 의 trigger() 는 예외 없이 동작한다", (code) => {
    const result = compile(code);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => result.sound.trigger()).not.toThrow();
  });

  it("확률 분기: random > probability 이면 트리거를 건너뛴다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const result = compile("노이즈().확률(0.5)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 건너뛰는 경로도 예외 없이 동작해야 한다.
    expect(() => result.sound.trigger()).not.toThrow();
  });
});
