"use client";
import { useUIStore } from "@/stores/ui";
import { useCellsStore } from "@/stores/cells";
import { useRecordingStore } from "@/stores/recording";

export function Header() {
  const bpm = useUIStore((s) => s.bpm);
  const filledCount = Object.values(useCellsStore((s) => s.cells)).filter((c) => c.code.trim()).length;
  const isRecording = useRecordingStore((s) => s.isRecording);

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-5 border-4 border-arcade-maze bg-arcade-bg shadow-mazeGlow">
      <div className="flex flex-col gap-1.5">
        <div className="text-[8px] tracking-[2px] text-arcade-dot">1UP · TEMPO</div>
        <div className="font-crt text-[28px] leading-none tracking-[2px] text-arcade-pac">{bpm} BPM</div>
      </div>

      <div className="flex items-center gap-[18px] px-5">
        <PixelLogo />
        <div className="text-[22px] tracking-[4px] text-arcade-pac" style={{ textShadow: "0 0 12px rgba(255,233,0,.5)" }}>
          PADCODE
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 border-2 border-arcade-red text-arcade-red animate-recFlash">
            <span className="w-2 h-2 bg-arcade-red rounded-full" />
            <span className="text-[10px] tracking-[2px]">RECORDING</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 items-end text-right">
        <div className="text-[8px] tracking-[2px] text-arcade-dot">PADS · USED</div>
        <div className="font-crt text-[28px] leading-none tracking-[2px] text-arcade-red">
          {String(filledCount).padStart(2, "0")} / 16
        </div>
      </div>
    </header>
  );
}

function PixelLogo() {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" className="w-10 h-10">
      <rect x="3" y="1" width="10" height="2" fill="#ffe900" />
      <rect x="2" y="2" width="12" height="2" fill="#ffe900" />
      <rect x="1" y="3" width="14" height="2" fill="#ffe900" />
      <rect x="1" y="5" width="9" height="2" fill="#ffe900" />
      <rect x="1" y="7" width="6" height="2" fill="#ffe900" />
      <rect x="1" y="9" width="9" height="2" fill="#ffe900" />
      <rect x="1" y="11" width="14" height="2" fill="#ffe900" />
      <rect x="2" y="13" width="12" height="2" fill="#ffe900" />
      <rect x="3" y="14" width="10" height="1" fill="#ffe900" />
    </svg>
  );
}
