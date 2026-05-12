import { create } from "zustand";

export type SampleEntry = {
  name: string;
  fileName: string;
  size: number;
  url: string;
};

type SamplesState = {
  samples: SampleEntry[];
  addSample: (entry: SampleEntry) => void;
  removeSample: (name: string) => void;
};

export const useSamplesStore = create<SamplesState>((set) => ({
  samples: [],
  addSample: (entry) =>
    set((s) => {
      const existing = s.samples.find((x) => x.name === entry.name);
      if (existing) URL.revokeObjectURL(existing.url);
      return {
        samples: [...s.samples.filter((x) => x.name !== entry.name), entry],
      };
    }),
  removeSample: (name) =>
    set((s) => {
      const target = s.samples.find((x) => x.name === name);
      if (target) URL.revokeObjectURL(target.url);
      return { samples: s.samples.filter((x) => x.name !== name) };
    }),
}));
