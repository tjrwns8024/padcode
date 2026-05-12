export const KEYMAP_4X4: string[][] = [
  ["1", "2", "3", "4"],
  ["q", "w", "e", "r"],
  ["a", "s", "d", "f"],
  ["z", "x", "c", "v"],
];

const KEY_TO_CODE: Record<string, string> = {
  "1": "Digit1",
  "2": "Digit2",
  "3": "Digit3",
  "4": "Digit4",
  q: "KeyQ",
  w: "KeyW",
  e: "KeyE",
  r: "KeyR",
  a: "KeyA",
  s: "KeyS",
  d: "KeyD",
  f: "KeyF",
  z: "KeyZ",
  x: "KeyX",
  c: "KeyC",
  v: "KeyV",
};

const CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).map(([k, v]) => [v, k]),
);

export function cellId(row: number, col: number): string {
  return `r${row}c${col}`;
}

export function eventToCellId(e: KeyboardEvent): string | null {
  // Prefer physical code (IME-independent), fall back to key
  const fromCode = CODE_TO_KEY[e.code];
  const k = fromCode ?? e.key.toLowerCase();
  for (let r = 0; r < KEYMAP_4X4.length; r++) {
    const c = KEYMAP_4X4[r].indexOf(k);
    if (c >= 0) return cellId(r, c);
  }
  return null;
}

export function keyToCellId(key: string): string | null {
  const k = key.toLowerCase();
  for (let r = 0; r < KEYMAP_4X4.length; r++) {
    const c = KEYMAP_4X4[r].indexOf(k);
    if (c >= 0) return cellId(r, c);
  }
  return null;
}
