"use client";
import * as Tone from "tone";

const buffers = new Map<string, Tone.ToneAudioBuffer>();

function key(name: string) {
  return name.trim().toLowerCase();
}

export async function loadSampleFromFile(name: string, file: File): Promise<void> {
  const k = key(name);
  const arrayBuf = await file.arrayBuffer();
  const ctx = Tone.getContext().rawContext as unknown as AudioContext;
  const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
  const toneBuf = new Tone.ToneAudioBuffer(audioBuffer);
  const old = buffers.get(k);
  if (old) old.dispose();
  buffers.set(k, toneBuf);
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
