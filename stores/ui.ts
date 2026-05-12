import { create } from "zustand";

export type PerformanceMode = "live" | "rec" | "play";

type UIState = {
  selectedCellId: string | null;
  pulsingCellId: string | null;
  mode: PerformanceMode;
  bpm: number;

  selectCell: (id: string | null) => void;
  pulse: (id: string) => void;
  setMode: (mode: PerformanceMode) => void;
  setBpm: (bpm: number) => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedCellId: null,
  pulsingCellId: null,
  mode: "live",
  bpm: 120,

  selectCell: (id) => set({ selectedCellId: id }),
  pulse: (id) => {
    set({ pulsingCellId: id });
    setTimeout(() => {
      set((state) => (state.pulsingCellId === id ? { pulsingCellId: null } : state));
    }, 200);
  },
  setMode: (mode) => set({ mode }),
  setBpm: (bpm) => set({ bpm: Math.max(60, Math.min(200, bpm)) }),
}));
