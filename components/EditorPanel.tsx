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

  useEffect(() => {
    if (!selectedCellId) return;
    setSavedFlash((n) => n + 1);
  }, [cell?.code, selectedCellId]);

  return (
    <aside className="border-4 border-arcade-maze bg-arcade-bg flex flex-col overflow-hidden">
      <div className="bg-arcade-maze px-3.5 py-2.5 flex justify-between items-center">
        <div className="text-[9px] tracking-[2px] text-arcade-dot">CODE.SYS</div>
        <div className="text-[8px] tracking-[1px] text-arcade-pac">
          {selectedCellId ? `► PAD ${cell?.keyBinding?.toUpperCase() ?? "?"}` : "(NO PAD SELECTED)"}
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(0,255,127,.03) 22px, rgba(0,255,127,.03) 24px), linear-gradient(#000,#000)",
        }}
      >
        {selectedCellId && cell ? (
          <CodeMirror
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

      <div className="px-3.5 py-2 border-t-2 border-arcade-maze text-[8px] tracking-[1.5px] text-arcade-dim flex justify-between">
        <span className="text-arcade-pac">► READY.</span>
        <span>{selectedCellId ? `SAVED · ${String(savedFlash).padStart(3, "0")}` : "—"}</span>
      </div>
    </aside>
  );
}
