import { Diagnostic, linter } from "@codemirror/lint";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { compile, DSL_FUNCTION_NAMES } from "@/lib/dsl/builder";

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
    })),
    validFor: KOREAN_RE,
  };
}

export const dslAutocomplete = autocompletion({
  override: [dslCompletions],
});
