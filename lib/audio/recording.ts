"use client";
import { getRecorder } from "./master";
import { useRecordingStore } from "@/stores/recording";

export async function startRecording() {
  const recorder = getRecorder();
  if (recorder.state === "started") return;
  await recorder.start();
  useRecordingStore.getState().setIsRecording(true, Date.now());
}

export async function stopRecording() {
  const recorder = getRecorder();
  if (recorder.state !== "started") return;
  const startedAt = useRecordingStore.getState().startedAt;
  const duration = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const blob = await recorder.stop();
  useRecordingStore.getState().saveBlob(blob, duration);
}
