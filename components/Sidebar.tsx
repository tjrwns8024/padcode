"use client";
import { useEffect, useRef, useState } from "react";
import { useCellsStore } from "@/stores/cells";
import { useUIStore } from "@/stores/ui";
import { useSamplesStore, type SampleEntry } from "@/stores/samples";
import { ensureAudioContext } from "@/lib/audio/engine";
import { loadSampleFromFile, removeSample as removeSampleBuf } from "@/lib/audio/sampleBank";

type Preset = {
  name: string;
  color: string;
  code: string;
};

const PRESETS: Preset[] = [
  { name: "KICK", color: "#ff2020", code: '샘플("kick").게인(1)' },
  { name: "SNARE", color: "#ffb8de", code: '샘플("snare").게인(0.8)' },
  { name: "HAT", color: "#00ffe9", code: '샘플("hat").게인(0.5)' },
  { name: "SINE", color: "#ffe900", code: "사인파(440).게인(0.4).스무딩(30)" },
  { name: "BASS", color: "#ff9b1a", code: "사인파(80).게인(0.7).로우패스(200)" },
  { name: "ARP", color: "#ffe900", code: "사인파(660).게인(0.3).딜레이(0.125).에코(20)" },
  { name: "CLAP", color: "#ffffff", code: '샘플("clap").게인(0.7)' },
  { name: "DELAY", color: "#ffe900", code: "노이즈().게인(0.2).밴드패스(2000).딜레이(0.25)" },
];

function sanitizeName(raw: string): string {
  return raw
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "sample";
}

export function Sidebar() {
  const setCode = useCellsStore((s) => s.setCode);
  const selectedCellId = useUIStore((s) => s.selectedCellId);
  const samples = useSamplesStore((s) => s.samples);
  const addSample = useSamplesStore((s) => s.addSample);
  const removeSample = useSamplesStore((s) => s.removeSample);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[samples store] now has", samples.length, samples.map((s) => s.name));
  }, [samples]);

  const insert = (code: string) => {
    if (!selectedCellId) return;
    setCode(selectedCellId, code);
  };

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    console.log("[sample upload] picked", file.name, file.type, file.size);
    if (file.size > 20 * 1024 * 1024) {
      setError("20MB 이하만 가능");
      return;
    }
    const baseName = sanitizeName(file.name);
    let name = baseName;
    let n = 2;
    const existing = new Set(samples.map((s) => s.name));
    while (existing.has(name)) name = `${baseName}_${n++}`;

    setUploading(true);
    try {
      await ensureAudioContext();
      console.log("[sample upload] audio context ready, decoding…");
      await loadSampleFromFile(name, file);
      console.log("[sample upload] decoded:", name);
      const url = URL.createObjectURL(file);
      const entry: SampleEntry = { name, fileName: file.name, size: file.size, url };
      addSample(entry);
    } catch (err) {
      console.error("[sample upload] failed", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const onRemove = (name: string) => {
    removeSampleBuf(name);
    removeSample(name);
  };

  return (
    <aside className="border-4 border-arcade-maze bg-arcade-bg p-3.5 overflow-y-auto flex flex-col">
      <div className="text-[9px] tracking-[1.5px] text-arcade-pac text-center mb-2 pb-2 border-b-2 border-dotted border-arcade-dim">
        MY SAMPLES ({samples.length})
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a"
        onChange={onFile}
        className="hidden"
      />
      <button
        onClick={onPick}
        disabled={uploading}
        className="w-full py-2 border-2 border-arcade-pac text-arcade-pac text-[9px] tracking-[1.5px] hover:bg-arcade-pac hover:text-arcade-bg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "LOADING…" : "+ UPLOAD MP3"}
      </button>

      {error && (
        <div className="text-[8px] tracking-[1px] text-arcade-red mt-2 leading-relaxed">
          ! {error}
        </div>
      )}

      {samples.length === 0 && !error && (
        <div className="text-[8px] tracking-[1px] text-arcade-dim mt-2 leading-relaxed">
          MP3/WAV을 업로드하면 샘플("이름")으로 사용 가능
        </div>
      )}

      <div className="mt-2 flex flex-col gap-1">
        {samples.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-1.5 border-2 border-transparent hover:border-arcade-dim"
          >
            <button
              onClick={() => insert(`샘플("${s.name}").게인(1)`)}
              disabled={!selectedCellId}
              title={s.fileName}
              className="flex items-center gap-2 px-1.5 py-2 flex-1 text-left text-[9px] tracking-[1px] text-arcade-dot disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
            >
              <span className="w-4 h-4 flex-shrink-0 bg-arcade-cyan" />
              <span className="flex-1 truncate">{s.name}</span>
            </button>
            <button
              onClick={() => onRemove(s.name)}
              aria-label={`remove ${s.name}`}
              className="text-[10px] text-arcade-dim hover:text-arcade-red px-1.5 py-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t-2 border-dotted border-arcade-dim">
        <div className="text-[9px] tracking-[1.5px] text-arcade-pac text-center mb-2">
          SOUND BANK
        </div>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => insert(p.code)}
            disabled={!selectedCellId}
            className="flex items-center gap-2 px-1.5 py-2 border-2 border-transparent hover:border-arcade-dim w-full text-left text-[9px] tracking-[1px] disabled:opacity-40 mb-1 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="w-4 h-4 flex-shrink-0" style={{ background: p.color }} />
            <span className="flex-1">{p.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
