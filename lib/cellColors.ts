export type PadColor = "kick" | "snare" | "hat" | "bass" | "synth" | "fx" | "empty";

const PALETTE: Record<Exclude<PadColor, "empty">, string> = {
  kick: "#ff2020",
  snare: "#ffb8de",
  hat: "#00ffe9",
  bass: "#ff9b1a",
  synth: "#ffe900",
  fx: "#ffffff",
};

export function colorFor(pad: PadColor): string | null {
  if (pad === "empty") return null;
  return PALETTE[pad];
}

export function inferColorFromCode(code: string): PadColor {
  if (!code.trim()) return "empty";
  const lower = code.toLowerCase();
  if (lower.includes('"kick"') || lower.includes("'kick'")) return "kick";
  if (lower.includes('"snare"') || lower.includes("'snare'") || lower.includes('"clap"')) return "snare";
  if (lower.includes('"hat"') || lower.includes("'hat'") || lower.includes("hihat")) return "hat";
  if (lower.includes("bass")) return "bass";
  if (lower.includes("사인파") || lower.includes("sin(")) return "synth";
  return "fx";
}
