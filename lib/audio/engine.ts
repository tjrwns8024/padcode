"use client";
import * as Tone from "tone";
import { compile, CompiledSound } from "@/lib/dsl/builder";

let started = false;
const compiledByCell: Map<string, { code: string; sound: CompiledSound | null }> = new Map();

export async function ensureAudioContext() {
  if (started) return;
  await Tone.start();
  started = true;
}

export function triggerCellCode(cellId: string, code: string): { ok: boolean; error?: string } {
  const entry = compiledByCell.get(cellId);
  if (entry && entry.code === code && entry.sound) {
    entry.sound.trigger();
    return { ok: true };
  }
  if (entry?.sound) entry.sound.dispose();

  const result = compile(code);
  if (!result.ok) {
    compiledByCell.set(cellId, { code, sound: null });
    return { ok: false, error: result.error };
  }
  compiledByCell.set(cellId, { code, sound: result.sound });
  result.sound.trigger();
  return { ok: true };
}

export function disposeCell(cellId: string) {
  const entry = compiledByCell.get(cellId);
  if (entry?.sound) entry.sound.dispose();
  compiledByCell.delete(cellId);
}
