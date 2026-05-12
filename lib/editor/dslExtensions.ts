import { Diagnostic, linter } from "@codemirror/lint";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { compile, DSL_FUNCTION_NAMES } from "@/lib/dsl/builder";

const DSL_SIGNATURES: Record<string, { detail: string; info: string }> = {
  사인파: { detail: "freq: number", info: "사인파 오실레이터\n예) 사인파(440)" },
  sin:   { detail: "freq: number", info: "사인파 오실레이터\n예) sin(440)" },
  노이즈: { detail: "()", info: "화이트 노이즈\n예) 노이즈().게인(0.3)" },
  noise:  { detail: "()", info: "화이트 노이즈\n예) noise().gain(0.3)" },
  샘플:  { detail: "name: string", info: '"kick" "snare" "hat" "clap" "tom" "cymbal"\n예) 샘플("kick").게인(1)' },
  sample: { detail: "name: string", info: '"kick" "snare" "hat" "clap" "tom" "cymbal"\n예) sample("kick").gain(1)' },
  게인:  { detail: "volume: 0~2",      info: "볼륨 조절. 기본값 0.6\n예) .게인(0.5)" },
  gain:   { detail: "volume: 0~2",      info: "볼륨 조절. 기본값 0.6\n예) .gain(0.5)" },
  로우패스: { detail: "hz: number",    info: "저역 통과 필터\n예) .로우패스(800)" },
  lowpass:  { detail: "hz: number",    info: "저역 통과 필터\n예) .lowpass(800)" },
  밴드패스: { detail: "hz: number",    info: "대역 통과 필터\n예) .밴드패스(2000)" },
  bandpass: { detail: "hz: number",    info: "대역 통과 필터\n예) .bandpass(2000)" },
  딜레이:  { detail: "time: 0~1",      info: "딜레이. 박자 단위\n예) .딜레이(1/8)" },
  delay:   { detail: "time: 0~1",      info: "딜레이. 박자 단위\n예) .delay(1/8)" },
  피치다운: { detail: "semitones: number", info: "피치 낮추기 (반음 단위)\n예) .피치다운(12)" },
  pitch:    { detail: "semitones: number", info: "피치 낮추기 (반음 단위)\n예) .pitch(12)" },
  스무딩:  { detail: "ms: number",     info: "어택 스무딩 (밀리초)\n예) .스무딩(30)" },
  smooth:  { detail: "ms: number",     info: "어택 스무딩 (밀리초)\n예) .smooth(30)" },
  에코:    { detail: "level: 0~100",   info: "피드백 에코. 클수록 강함\n예) .에코(20)" },
  echo:    { detail: "level: 0~100",   info: "피드백 에코. 클수록 강함\n예) .echo(20)" },
  스텝:   { detail: "pattern: string", info: 'x=트리거 .=쉬기\n예) .스텝("x..x.x.")' },
  step:   { detail: "pattern: string", info: 'x=트리거 .=쉬기\n예) .step("x..x.x.")' },
  확률:   { detail: "p: 0~1",          info: "랜덤 트리거 확률. 1=항상\n예) .확률(0.7)" },
  prob:   { detail: "p: 0~1",          info: "랜덤 트리거 확률. 1=항상\n예) .prob(0.7)" },
};

export const dslLinter = linter((view) => {
  const code = view.state.doc.toString();
  if (!code.trim()) return [];
  const result = compile(code);
  if (result.ok) return [];
  const diag: Diagnostic = {
    from: 0,
    to: code.length,
    severity: "error",
    message: result.error,
  };
  return [diag];
});

const KOREAN_RE = /[가-힣ㄱ-ㅎㅏ-ㅣ\w]+/;

function dslCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(KOREAN_RE);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: DSL_FUNCTION_NAMES.map((name) => ({
      label: name,
      type: "function",
      detail: DSL_SIGNATURES[name]?.detail,
      info: DSL_SIGNATURES[name]?.info,
    })),
    validFor: KOREAN_RE,
  };
}

export const dslAutocomplete = autocompletion({
  override: [dslCompletions],
});
