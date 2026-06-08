import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

// 프리셋/자동저장에 담는 셀 단위 편집 정보. keyBinding/row/col 같은 정적
// 값은 코드(initCells)에서 항상 새로 만들므로 저장하지 않는다.
export type CellSnapshot = {
  code: string;
  playMode: PlayMode;
  looping: boolean;
};
export type GridSnapshot = Record<string, CellSnapshot>;

type CellsState = {
  cells: Record<string, CellData>;
  setCode: (id: string, code: string) => void;
  clearCode: (id: string) => void;
  setPlayMode: (id: string, mode: PlayMode) => void;
  toggleLoop: (id: string) => void;
  loadSnapshot: (snapshot: GridSnapshot) => void;
};

const STORAGE_KEY = "padcode:grid";

const gridStorage = createJSONStorage<{ cells: GridSnapshot }>(() =>
  typeof window !== "undefined"
    ? window.localStorage
    : (undefined as unknown as Storage),
);

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

export const useCellsStore = create<CellsState>()(
  persist(
    (set) => ({
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
      // 프리셋 스냅샷을 그리드에 적용한다. 정적 필드(keyBinding/row/col)는
      // 기존 셀에서 유지하고 편집 필드만 덮어쓴다. 엔진은 다음 트리거 때
      // code 변경을 감지해 lazy 하게 재컴파일하므로 여기서 dispose 하지 않는다.
      loadSnapshot: (snapshot) =>
        set((state) => {
          const cells = { ...state.cells };
          for (const id of Object.keys(cells)) {
            const s = snapshot[id];
            cells[id] = {
              ...cells[id],
              code: s?.code ?? "",
              playMode: s?.playMode ?? "oneshot",
              looping: s?.looping ?? false,
            };
          }
          return { cells };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: gridStorage,
      // SSR/하이드레이션 미스매치 방지: 생성 시 자동 복원하지 않고
      // 클라이언트 마운트 후 StorageBootstrap 에서 rehydrate() 호출.
      skipHydration: true,
      // 편집 필드만 저장한다.
      partialize: (state) => ({
        cells: Object.fromEntries(
          Object.entries(state.cells).map(([id, c]) => [
            id,
            { code: c.code, playMode: c.playMode, looping: c.looping },
          ]),
        ) as GridSnapshot,
      }),
      // 저장된 편집 필드를 항상 최신 initCells 위에 머지한다.
      merge: (persisted, current) => {
        const saved = (persisted as { cells?: GridSnapshot } | undefined)?.cells;
        if (!saved) return current;
        const cells = { ...current.cells };
        for (const [id, s] of Object.entries(saved)) {
          if (cells[id]) {
            cells[id] = {
              ...cells[id],
              code: s.code ?? "",
              playMode: s.playMode ?? "oneshot",
              looping: s.looping ?? false,
            };
          }
        }
        return { ...current, cells };
      },
    },
  ),
);
