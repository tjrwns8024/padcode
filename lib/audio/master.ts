"use client";
import * as Tone from "tone";

let master: Tone.Gain | null = null;
let analyser: Tone.Analyser | null = null;
let recorder: Tone.Recorder | null = null;

export function getMaster(): Tone.Gain {
  if (!master) {
    master = new Tone.Gain(0.9);
    master.toDestination();

    analyser = new Tone.Analyser({
      type: "fft",
      size: 64,
      smoothing: 0.7,
    });
    master.connect(analyser);

    recorder = new Tone.Recorder();
    master.connect(recorder);
  }
  return master;
}

export function getAnalyser(): Tone.Analyser {
  getMaster();
  return analyser!;
}

export function getRecorder(): Tone.Recorder {
  getMaster();
  return recorder!;
}

export function readFftLevels(binCount: number): number[] {
  if (!analyser) return new Array(binCount).fill(0);
  const raw = analyser.getValue() as Float32Array;
  const out: number[] = [];
  const groupSize = Math.max(1, Math.floor(raw.length / binCount));
  for (let i = 0; i < binCount; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i * groupSize; j < (i + 1) * groupSize && j < raw.length; j++) {
      sum += raw[j];
      count++;
    }
    const avgDb = count > 0 ? sum / count : -100;
    const norm = Math.max(0, Math.min(1, (avgDb + 100) / 70));
    out.push(norm);
  }
  return out;
}

export function getRmsLevel(): number {
  if (!analyser) return 0;
  const raw = analyser.getValue() as Float32Array;
  let sum = 0;
  for (let i = 0; i < raw.length; i++) {
    const v = Math.max(0, (raw[i] + 100) / 70);
    sum += v * v;
  }
  return Math.sqrt(sum / raw.length);
}
