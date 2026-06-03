import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordingStore } from "@/stores/recording";

// jsdom 에 없는 URL.createObjectURL/revokeObjectURL 을 스텁한다.
// createObjectURL 은 호출마다 고유 url 을 돌려줘 교체 시 revoke 대상을 구분한다.
const revokeObjectURL = vi.fn();
let urlSeq = 0;
const createObjectURL = vi.fn(() => `blob:rec-${++urlSeq}`);

beforeEach(() => {
  revokeObjectURL.mockClear();
  createObjectURL.mockClear();
  urlSeq = 0;
  globalThis.URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
  globalThis.URL.revokeObjectURL = revokeObjectURL;
  useRecordingStore.setState({
    isRecording: false,
    blobUrl: null,
    duration: 0,
    startedAt: null,
    isPlayingBack: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const fakeBlob = () => ({ size: 1 }) as Blob;

describe("setIsRecording", () => {
  it("startedAt 을 명시하면 그대로 기록한다", () => {
    useRecordingStore.getState().setIsRecording(true, 1234);
    const s = useRecordingStore.getState();
    expect(s.isRecording).toBe(true);
    expect(s.startedAt).toBe(1234);
  });

  it("startedAt 미지정 시 Date.now() 로 폴백한다", () => {
    vi.spyOn(Date, "now").mockReturnValue(9999);
    useRecordingStore.getState().setIsRecording(true);
    expect(useRecordingStore.getState().startedAt).toBe(9999);
  });

  it("정지하면 startedAt 을 null 로 비운다", () => {
    const { setIsRecording } = useRecordingStore.getState();
    setIsRecording(true, 1234);
    setIsRecording(false);
    const s = useRecordingStore.getState();
    expect(s.isRecording).toBe(false);
    expect(s.startedAt).toBeNull();
  });
});

describe("saveBlob", () => {
  it("blob url·duration 을 저장하고 녹음 상태를 정리한다", () => {
    const { setIsRecording, saveBlob } = useRecordingStore.getState();
    setIsRecording(true, 1234);
    saveBlob(fakeBlob(), 3.5);

    const s = useRecordingStore.getState();
    expect(s.blobUrl).toBe("blob:rec-1");
    expect(s.duration).toBe(3.5);
    expect(s.isRecording).toBe(false);
    expect(s.startedAt).toBeNull();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("기존 blobUrl 이 있으면 이전 url 을 revoke 한다(메모리 누수 방지)", () => {
    const { saveBlob } = useRecordingStore.getState();
    saveBlob(fakeBlob(), 1);
    expect(useRecordingStore.getState().blobUrl).toBe("blob:rec-1");
    expect(revokeObjectURL).not.toHaveBeenCalled();

    saveBlob(fakeBlob(), 2);
    expect(useRecordingStore.getState().blobUrl).toBe("blob:rec-2");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:rec-1");
  });
});

describe("clearRecording", () => {
  it("기존 blobUrl 을 revoke 하고 상태를 초기화한다", () => {
    const { saveBlob, setPlayingBack, clearRecording } = useRecordingStore.getState();
    saveBlob(fakeBlob(), 5);
    setPlayingBack(true);

    clearRecording();
    const s = useRecordingStore.getState();
    expect(s.blobUrl).toBeNull();
    expect(s.duration).toBe(0);
    expect(s.isPlayingBack).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:rec-1");
  });

  it("blobUrl 이 없으면 revoke 를 호출하지 않는다", () => {
    useRecordingStore.getState().clearRecording();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe("setPlayingBack", () => {
  it("isPlayingBack 플래그를 전이한다", () => {
    const { setPlayingBack } = useRecordingStore.getState();
    setPlayingBack(true);
    expect(useRecordingStore.getState().isPlayingBack).toBe(true);
    setPlayingBack(false);
    expect(useRecordingStore.getState().isPlayingBack).toBe(false);
  });
});
