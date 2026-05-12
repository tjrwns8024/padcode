"use client";
import * as Tone from "tone";

const buffers = new Map<string, Tone.ToneAudioBuffer>();

function key(name: string) {
  return name.trim().toLowerCase();
}

export async function loadSampleFromUrl(name: string, url: string): Promise<void> {
  const k = key(name);
  const buf = new Tone.ToneAudioBuffer();
  await buf.load(url);
  const old = buffers.get(k);
  if (old) old.dispose();
  buffers.set(k, buf);
}

export function getSampleBuffer(name: string): Tone.ToneAudioBuffer | null {
  return buffers.get(key(name)) ?? null;
}

export function removeSample(name: string): void {
  const k = key(name);
  const b = buffers.get(k);
  if (b) {
    b.dispose();
    buffers.delete(k);
  }
}

export function hasSample(name: string): boolean {
  return buffers.has(key(name));
}
