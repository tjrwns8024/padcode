import { create } from "zustand";

type RecordingState = {
  isRecording: boolean;
  blobUrl: string | null;
  duration: number;
  startedAt: number | null;
  isPlayingBack: boolean;

  setIsRecording: (rec: boolean, startedAt?: number) => void;
  saveBlob: (blob: Blob, duration: number) => void;
  clearRecording: () => void;
  setPlayingBack: (p: boolean) => void;
};

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  blobUrl: null,
  duration: 0,
  startedAt: null,
  isPlayingBack: false,

  setIsRecording: (rec, startedAt) =>
    set({ isRecording: rec, startedAt: rec ? (startedAt ?? Date.now()) : null }),

  saveBlob: (blob, duration) => {
    const old = get().blobUrl;
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(blob);
    set({ blobUrl: url, duration, isRecording: false, startedAt: null });
  },

  clearRecording: () => {
    const old = get().blobUrl;
    if (old) URL.revokeObjectURL(old);
    set({ blobUrl: null, duration: 0, isPlayingBack: false });
  },

  setPlayingBack: (p) => set({ isPlayingBack: p }),
}));
