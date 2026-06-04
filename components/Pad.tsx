"use client";
import { useCellsStore } from "@/stores/cells";
import { useUIStore } from "@/stores/ui";
import { ensureAudioContext, triggerCellCode } from "@/lib/audio/engine";
import { inferColorFromCode, colorFor } from "@/lib/cellColors";

export function Pad({ cellId }: { cellId: string }) {
  const cell = useCellsStore((s) => s.cells[cellId]);
  const selectedCellId = useUIStore((s) => s.selectedCellId);
  const pulsingCellId = useUIStore((s) => s.pulsingCellId);
  const selectCell = useUIStore((s) => s.selectCell);
  const pulse = useUIStore((s) => s.pulse);
  const toggleLoop = useCellsStore((s) => s.toggleLoop);
  const clearCode = useCellsStore((s) => s.clearCode);

  const empty = !cell.code.trim();
  const color = empty ? null : colorFor(inferColorFromCode(cell.code));
  const selected = selectedCellId === cellId;
  const pulsing = pulsingCellId === cellId;

  const onClick = () => {
    selectCell(cellId);
  };

  const onPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (empty) return;
    await ensureAudioContext();
    triggerCellCode(cellId, cell.code);
    pulse(cellId);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (empty) return;
    toggleLoop(cellId);
  };

  return (
    <div
      data-testid="pad"
      data-cell-id={cellId}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative cursor-pointer flex flex-col items-center justify-center p-2 transition-transform hover:-translate-y-0.5 select-none ${
        pulsing ? "animate-padBlink" : ""
      }`}
      style={{
        background: color ?? "#000",
        border: "4px solid #000",
        boxShadow: selected
          ? "0 0 0 2px #2121de, 0 0 0 6px #fff"
          : empty
            ? "0 0 0 2px #4444aa"
            : "0 0 0 2px #2121de",
      }}
    >
      {cell.looping && !empty && (
        <span
          className="absolute top-1 right-1 text-[6px] tracking-[1px] px-1"
          style={{ background: "rgba(0,0,0,0.3)", color: "#000" }}
        >
          LOOP
        </span>
      )}

      {!empty && (
        <>
          <button
            onClick={onPlay}
            className="absolute top-1 left-1 w-4 h-4 flex items-center justify-center hover:scale-110"
            aria-label="trigger"
            title="재생"
          >
            <svg viewBox="0 0 8 8" className="w-3 h-3" shapeRendering="crispEdges">
              <rect x="2" y="1" width="1" height="6" fill="#000" />
              <rect x="3" y="2" width="1" height="4" fill="#000" />
              <rect x="4" y="3" width="1" height="2" fill="#000" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearCode(cellId);
            }}
            className="absolute bottom-1 right-1 w-4 h-4 flex items-center justify-center hover:scale-125 font-pixel text-[10px]"
            style={{ color: "#000" }}
            aria-label="clear"
            title="삭제 (Delete 키도 가능)"
          >
            ✕
          </button>
        </>
      )}

      <span
        className="font-pixel text-[14px] leading-none mb-1"
        style={{ color: empty ? "#4444aa" : "#000", textShadow: empty ? "none" : "1px 1px 0 rgba(0,0,0,.3)" }}
      >
        {cell.keyBinding?.toUpperCase() ?? ""}
      </span>
      <span
        className="font-pixel text-[7px] tracking-[1px] text-center leading-tight"
        style={{ color: empty ? "#4444aa" : "#000" }}
      >
        {empty ? "— — —" : labelFromCode(cell.code)}
      </span>
    </div>
  );
}

function labelFromCode(code: string): string {
  const lower = code.toLowerCase();
  if (lower.includes('"kick"')) return "KICK";
  if (lower.includes('"snare"')) return "SNARE";
  if (lower.includes('"hat"') || lower.includes("hihat")) return "HIHAT";
  if (lower.includes('"clap"')) return "CLAP";
  if (lower.includes("bass") || lower.match(/사인파\((\d+)\)/)?.[1] === "80") return "BASS";
  if (lower.includes("사인파") || lower.includes("sin(")) return "SINE";
  if (lower.includes("노이즈") || lower.includes("noise")) return "NOISE";
  if (lower.includes("샘플") || lower.includes("sample")) return "SAMPLE";
  return "FX";
}
