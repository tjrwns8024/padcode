"use client";
import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useRecordingStore } from "@/stores/recording";
import { ensureAudioContext } from "@/lib/audio/engine";
import { startRecording, stopRecording } from "@/lib/audio/recording";
import { readFftLevels, getRmsLevel } from "@/lib/audio/master";

const BAR_COUNT = 28;
const BAR_COLORS = ["#ff2020", "#ff9b1a", "#ffe900", "#00ffe9", "#ffb8de", "#ffffff"];

export function Visualizer() {
  const isRecording = useRecordingStore((s) => s.isRecording);
  const blobUrl = useRecordingStore((s) => s.blobUrl);
  const duration = useRecordingStore((s) => s.duration);
  const clearRecording = useRecordingStore((s) => s.clearRecording);

  const [bars, setBars] = useState<number[]>(() => new Array(BAR_COUNT).fill(0));
  const [rms, setRms] = useState(0);
  const [tick, setTick] = useState(0);
  const [recElapsed, setRecElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let raf = 0;
    let lastTick = 0;
    let held = new Array(BAR_COUNT).fill(0);
    const loop = (ts: number) => {
      const levels = readFftLevels(BAR_COUNT);
      // Snap up instantly to new peaks, then ease back down so each bar
      // "pops" on a hit and falls smoothly — classic equalizer feel.
      held = levels.map((lv, i) => (lv >= held[i] ? lv : held[i] * 0.86));
      setBars(held);
      setRms(getRmsLevel());
      if (ts - lastTick > 90) {
        setTick((n) => n + 1);
        lastTick = ts;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setRecElapsed((Date.now() - start) / 1000), 50);
    return () => clearInterval(id);
  }, [isRecording]);

  const onRecToggle = async () => {
    await ensureAudioContext();
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  return (
    <section className="border-4 border-arcade-maze bg-arcade-bg grid grid-cols-[1fr_auto] overflow-hidden relative h-full">
      <div className="relative overflow-hidden border-r-4 border-arcade-maze">
        <div className="absolute top-2 left-3 text-[9px] tracking-[2px] text-arcade-pac z-10">▶ NOW PLAYING</div>

        <PacLane tick={tick} rms={mounted ? rms : 0} />

        <div className="h-1/2 flex items-end gap-1 px-3.5 pb-3.5 pt-2.5 border-t-2 border-arcade-maze" style={{ background: "#0a0a2e" }}>
          {bars.map((level, i) => {
            const h = Math.max(2, level * 100);
            const c = BAR_COLORS[i % BAR_COLORS.length];
            return (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: `${h}%`,
                  background: c,
                  boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.5), 0 0 ${level * 16}px ${c}80`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="w-[320px] p-4 flex flex-col gap-3 overflow-hidden" style={{ background: "#0a0a2e" }}>
        <div className="text-[9px] tracking-[2px] text-arcade-pac">▶ RECORDER</div>

        <button
          onClick={onRecToggle}
          className={`w-full py-4 border-[3px] font-pixel text-[12px] tracking-[2px] flex items-center justify-center gap-3 transition-transform hover:-translate-y-0.5 ${
            isRecording
              ? "border-arcade-red bg-arcade-red text-arcade-dot animate-recFlash"
              : "border-arcade-pac bg-arcade-bg text-arcade-pac hover:bg-arcade-pac hover:text-arcade-bg"
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-current" />
          {isRecording ? `STOP ${formatSeconds(recElapsed)}` : blobUrl ? "REC AGAIN" : "REC"}
        </button>

        {!isRecording && !blobUrl && (
          <div className="text-[8px] tracking-[1.5px] text-arcade-dim leading-relaxed">
            REC을 누르고 패드 키를 연주하세요. 다시 누르면 정지하고 아래에 결과가 나타납니다.
          </div>
        )}

        {isRecording && (
          <div className="text-[8px] tracking-[1.5px] text-arcade-red leading-relaxed">
            ● 녹음 중… 패드를 연주하고 STOP을 누르세요.
          </div>
        )}

        {blobUrl && !isRecording && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="text-[8px] tracking-[1.5px] text-arcade-pac">
              ✓ 녹음 {duration.toFixed(1)}초
            </div>
            <audio
              src={blobUrl}
              controls
              className="w-full h-8"
              style={{ filter: "hue-rotate(15deg) saturate(0.9)" }}
            />
            <div className="flex gap-2">
              <a
                href={blobUrl}
                download={`padcode-${Date.now()}.webm`}
                className="flex-1 text-center text-[9px] tracking-[1.5px] text-arcade-bg bg-arcade-cyan py-1.5 hover:opacity-80"
              >
                ⬇ 저장
              </a>
              <button
                onClick={clearRecording}
                className="flex-1 text-[9px] tracking-[1.5px] text-arcade-dot border border-arcade-dim py-1.5 hover:bg-arcade-dim/30"
              >
                ✕ 삭제
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-[8px] tracking-[2px] text-arcade-pac pt-1 border-t-2 border-dotted border-arcade-dim animate-blink mt-auto">
          ★ INSERT COIN TO PLAY ★
        </div>
      </div>
    </section>
  );
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function PacLane({ tick, rms }: { tick: number; rms: number }) {
  const dotCount = 22;
  const speed = 4 + rms * 30;
  const eaten = (tick / speed) % dotCount;
  const pacLeft = 36 + Math.sin(tick * 0.05) * 4;
  const glow = 0.3 + rms * 1.5;

  return (
    <div className="h-1/2 relative border-b-2 border-dotted border-arcade-dim overflow-hidden">
      <div className="absolute top-1/2 left-[60px] right-0 -translate-y-1/2 flex items-center gap-[22px] pr-8">
        {Array.from({ length: dotCount }).map((_, i) => {
          const isEaten = i < eaten;
          const isPower = i === 6 || i === 15;
          return (
            <div
              key={i}
              className={`flex-shrink-0 rounded-full ${isEaten ? "opacity-0" : ""} ${isPower ? "animate-pelletBlink" : ""}`}
              style={{
                width: isPower ? 14 : 6,
                height: isPower ? 14 : 6,
                background: "#fff",
                boxShadow: isPower ? "0 0 8px #fff" : "0 0 4px rgba(255,255,255,.5)",
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-1/2 -translate-y-1/2 z-30"
        style={{ left: `${pacLeft}%`, width: 32, height: 32 }}
      >
        <div
          className="absolute inset-0 rounded-full animate-chomp"
          style={{
            background: "#ffe900",
            boxShadow: `0 0 ${10 + rms * 30}px rgba(255,233,0,${glow})`,
            clipPath: "polygon(0 0, 100% 0, 100% 35%, 50% 50%, 100% 65%, 100% 100%, 0 100%)",
          }}
        />
      </div>

      <Ghost color="#ff2020" right="14%" delay={0} />
      <Ghost color="#00ffe9" right="8%" delay={-0.4} />
    </div>
  );
}

function Ghost({ color, right, delay }: { color: string; right: string; delay: number }) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 z-20"
      style={{ right, width: 28, height: 28, animation: `ghostBob 1.3s ease-in-out infinite ${delay}s` }}
    >
      <svg viewBox="0 0 16 18" shapeRendering="crispEdges" className="w-full h-full">
        <rect x="3" y="2" width="10" height="2" fill={color} />
        <rect x="2" y="3" width="12" height="2" fill={color} />
        <rect x="1" y="5" width="14" height="9" fill={color} />
        <rect x="1" y="14" width="2" height="2" fill={color} />
        <rect x="3" y="14" width="2" height="3" fill={color} />
        <rect x="5" y="14" width="2" height="2" fill={color} />
        <rect x="7" y="14" width="2" height="3" fill={color} />
        <rect x="9" y="14" width="2" height="2" fill={color} />
        <rect x="11" y="14" width="2" height="3" fill={color} />
        <rect x="13" y="14" width="2" height="2" fill={color} />
        <rect x="3" y="6" width="3" height="4" fill="#fff" />
        <rect x="10" y="6" width="3" height="4" fill="#fff" />
        <rect x="4" y="7" width="2" height="2" fill="#2121de" />
        <rect x="11" y="7" width="2" height="2" fill="#2121de" />
      </svg>
      <style jsx>{`
        @keyframes ghostBob {
          0%, 100% { transform: translate(0, -50%); }
          50% { transform: translate(-3px, -60%); }
        }
      `}</style>
    </div>
  );
}
