import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GridSnapshot } from "@/stores/cells";

// 그리드 전체(16칸)를 하나의 "에셋"으로 저장한 항목.
export type GridPreset = {
  id: string;
  name: string;
  createdAt: number;
  snapshot: GridSnapshot;
};

type PresetsState = {
  presets: GridPreset[];
  savePreset: (name: string, snapshot: GridSnapshot) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
};

const STORAGE_KEY = "padcode:presets";

const presetsStorage = createJSONStorage<{ presets: GridPreset[] }>(() =>
  typeof window !== "undefined"
    ? window.localStorage
    : (undefined as unknown as Storage),
);

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set) => ({
      presets: [],
      savePreset: (name, snapshot) =>
        set((s) => ({
          presets: [
            ...s.presets,
            { id: makeId(), name, createdAt: Date.now(), snapshot },
          ],
        })),
      renamePreset: (id, name) =>
        set((s) => ({
          presets: s.presets.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
      deletePreset: (id) =>
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      storage: presetsStorage,
      // 클라이언트 마운트 후 StorageBootstrap 에서 rehydrate() 호출.
      skipHydration: true,
    },
  ),
);
