import { create } from "zustand";
import { KEYMAP_4X4, cellId } from "@/lib/keymap";

export type PlayMode = "oneshot" | "loop";

export type CellData = {
  id: string;
  row: number;
  col: number;
  code: string;
  keyBinding: string | null;
  playMode: PlayMode;
  looping: boolean;
};

type CellsState = {
  cells: Record<string, CellData>;
  setCode: (id: string, code: string) => void;
  clearCode: (id: string) => void;
  setPlayMode: (id: string, mode: PlayMode) => void;
  toggleLoop: (id: string) => void;
};

function initCells(): Record<string, CellData> {
  const out: Record<string, CellData> = {};
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const id = cellId(r, c);
      out[id] = {
        id,
        row: r,
        col: c,
        code: "",
        keyBinding: KEYMAP_4X4[r][c] ?? null,
        playMode: "oneshot",
        looping: false,
      };
    }
  }
  return out;
}

export const useCellsStore = create<CellsState>((set) => ({
  cells: initCells(),
  setCode: (id, code) =>
    set((state) => ({
      cells: { ...state.cells, [id]: { ...state.cells[id], code } },
    })),
  clearCode: (id) =>
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], code: "", looping: false },
      },
    })),
  setPlayMode: (id, mode) =>
    set((state) => ({
      cells: { ...state.cells, [id]: { ...state.cells[id], playMode: mode } },
    })),
  toggleLoop: (id) =>
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], looping: !state.cells[id].looping },
      },
    })),
}));
