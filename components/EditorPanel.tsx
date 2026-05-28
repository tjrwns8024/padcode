"use client";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { useCellsStore } from "@/stores/cells";
import { useUIStore } from "@/stores/ui";
import { dslLinter, dslAutocomplete } from "@/lib/editor/dslExtensions";
import { useEffect, useState } from "react";

const arcadeTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#00ff7f",
      height: "100%",
    },
    ".cm-scroller": { overflow: "auto" },
    ".cm-content": { caretColor: "#00ff7f", fontFamily: '"VT323", monospace' },
    ".cm-cursor": { borderLeftColor: "#00ff7f", borderLeftWidth: "2px" },
    ".cm-line": { padding: "0 6px" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(255,233,0,0.25)",
    },
  },
  { dark: true },
);

export function EditorPanel() {
  const selectedCellId = useUIStore((s) => s.selectedCellId);
  const cell = useCellsStore((s) => (selectedCellId ? s.cells[selectedCellId] : null));
  const setCode = useCellsStore((s) => s.setCode);
  const [savedFlash, setSavedFlash] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCellId) return;
    setSavedFlash((n) => n + 1);
  }, [cell?.code, selectedCellId]);

  const generateSound = async () => {
    if (!selectedCellId || !aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setCode(selectedCellId, data.code);
      setAiPrompt("");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <aside className="border-4 border-arcade-maze bg-arcade-bg flex flex-col overflow-hidden h-full">
      <div className="bg-arcade-maze px-3.5 py-2.5 flex justify-between items-center">
        <div className="text-[9px] tracking-[2px] text-arcade-dot">CODE.SYS</div>
        <div className="text-[8px] tracking-[1px] text-arcade-pac">
          {selectedCellId ? `► PAD ${cell?.keyBinding?.toUpperCase() ?? "?"}` : "(NO PAD SELECTED)"}
        </div>
      </div>

      <div
        className="flex-1 relative min-h-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(0,255,127,.03) 22px, rgba(0,255,127,.03) 24px), linear-gradient(#000,#000)",
        }}
      >
        {selectedCellId && cell ? (
          <div className="absolute inset-0">
          <CodeMirror
            height="100%"
            style={{ height: "100%" }}
            value={cell.code}
            onChange={(v) => setCode(selectedCellId, v)}
            theme={arcadeTheme}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLineGutter: false,
              highlightActiveLine: true,
            }}
            extensions={[javascript(), dslLinter, dslAutocomplete]}
            placeholder={"// 셀에 사운드 코드를 입력하세요\n// 예) 사인파(440).게인(0.5).딜레이(0.125)"}
          />
          </div>
        ) : (
          <div className="font-crt text-[16px] text-arcade-phosphor opacity-50 p-4 leading-relaxed">
            <div>REM PADCODE READY</div>
            <div>&nbsp;</div>
            <div>&gt; SELECT A PAD TO EDIT</div>
            <div>&gt; OR CLICK A PRESET FROM</div>
            <div>&gt; THE SOUND BANK</div>
            <div>&nbsp;</div>
            <div className="text-arcade-pac">► READY.</div>
          </div>
        )}
      </div>

      <div className="border-t-2 border-arcade-maze px-3 py-2 flex flex-col gap-1.5">
        <div className="text-[8px] tracking-[2px] text-arcade-pac">► AI SOUND GEN</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generateSound(); }}
            disabled={!selectedCellId || aiLoading}
            placeholder={selectedCellId ? "사운드를 설명하세요..." : "패드를 먼저 선택하세요"}
            className="flex-1 bg-transparent border border-arcade-dim text-arcade-phosphor text-[10px] tracking-[0.5px] px-2 py-1 placeholder:text-arcade-dim/50 disabled:opacity-40 outline-none focus:border-arcade-pac font-crt"
          />
          <button
            onClick={generateSound}
            disabled={!selectedCellId || !aiPrompt.trim() || aiLoading}
            className="px-2 py-1 border border-arcade-pac text-arcade-pac text-[9px] tracking-[1px] hover:bg-arcade-pac hover:text-arcade-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? "…" : "GEN"}
          </button>
        </div>
        {aiLoading && (
          <div className="text-[8px] tracking-[2px] text-arcade-pac animate-blink">► GENERATING SOUND...</div>
        )}
        {!aiLoading && aiError && (
          <div className="text-[8px] tracking-[1px] text-arcade-red leading-relaxed truncate">! {aiError}</div>
        )}
      </div>

      <div className="px-3.5 py-2 border-t-2 border-arcade-maze text-[8px] tracking-[1.5px] text-arcade-dim flex justify-between">
        <span className="text-arcade-pac">► READY.</span>
        <span>{selectedCellId ? `SAVED · ${String(savedFlash).padStart(3, "0")}` : "—"}</span>
      </div>
    </aside>
  );
}
