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
      smoothing: 0.4,
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
  // The top FFT bins (highest frequencies) carry almost no energy and would
  // leave the right side of the bar row dead — only spread the lively portion.
  const usable = Math.max(binCount, Math.floor(raw.length * 0.72));
  const out: number[] = [];
  const groupSize = Math.max(1, Math.floor(usable / binCount));
  for (let i = 0; i < binCount; i++) {
    let max = -Infinity;
    for (let j = i * groupSize; j < (i + 1) * groupSize && j < usable; j++) {
      if (raw[j] > max) max = raw[j];
    }
    const db = max === -Infinity ? -100 : max;
    // Map -85..-20 dB → 0..1, then apply a perceptual curve so quiet bins still
    // dance, and a gentle high-frequency tilt to keep the right side alive.
    let norm = Math.max(0, Math.min(1, (db + 85) / 65));
    norm = Math.pow(norm, 0.6);
    norm *= 1 + (i / binCount) * 0.6;
    out.push(Math.min(1, norm));
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
