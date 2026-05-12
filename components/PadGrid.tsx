"use client";
import { Pad } from "./Pad";
import { cellId } from "@/lib/keymap";

export function PadGrid() {
  const ids: string[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) ids.push(cellId(r, c));

  return (
    <section className="border-4 border-arcade-maze bg-arcade-bg p-4 flex flex-col gap-3.5 relative h-full overflow-hidden">
      <div
        className="absolute inset-1.5 border-2 border-dotted border-arcade-dim pointer-events-none opacity-50"
        aria-hidden
      />
      <div className="grid grid-cols-4 grid-rows-4 gap-2.5 aspect-square max-w-[600px] max-h-[600px] m-auto w-full relative z-10 min-h-0">
        {ids.map((id) => (
          <Pad key={id} cellId={id} />
        ))}
      </div>
    </section>
  );
}
