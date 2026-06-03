import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSamplesStore, type SampleEntry } from "@/stores/samples";

// addSample/removeSample 은 이름 충돌·삭제 시 URL.revokeObjectURL 을 호출한다.
// jsdom 에 없을 수 있으므로 스텁한다.
const revokeObjectURL = vi.fn();

beforeEach(() => {
  revokeObjectURL.mockClear();
  globalThis.URL.revokeObjectURL = revokeObjectURL;
  useSamplesStore.setState({ samples: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function entry(name: string, url = `blob:${name}`): SampleEntry {
  return { name, fileName: `${name}.wav`, size: 1024, url };
}

describe("addSample", () => {
  it("샘플 항목을 추가하고 조회할 수 있다", () => {
    useSamplesStore.getState().addSample(entry("kick"));
    const { samples } = useSamplesStore.getState();
    expect(samples).toHaveLength(1);
    expect(samples[0].name).toBe("kick");
  });

  it("서로 다른 이름은 누적된다", () => {
    const { addSample } = useSamplesStore.getState();
    addSample(entry("kick"));
    addSample(entry("snare"));
    expect(useSamplesStore.getState().samples.map((s) => s.name)).toEqual([
      "kick",
      "snare",
    ]);
  });

  it("같은 이름이면 기존 항목을 교체하고 이전 url 을 revoke 한다", () => {
    const { addSample } = useSamplesStore.getState();
    addSample(entry("kick", "blob:old"));
    addSample(entry("kick", "blob:new"));

    const { samples } = useSamplesStore.getState();
    expect(samples).toHaveLength(1);
    expect(samples[0].url).toBe("blob:new");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:old");
  });
});

describe("removeSample", () => {
  it("이름으로 삭제하고 url 을 revoke 한다", () => {
    const { addSample, removeSample } = useSamplesStore.getState();
    addSample(entry("kick", "blob:kick"));
    removeSample("kick");

    expect(useSamplesStore.getState().samples).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:kick");
  });

  it("존재하지 않는 이름을 삭제해도 안전하다(revoke 미호출)", () => {
    useSamplesStore.getState().removeSample("nope");
    expect(useSamplesStore.getState().samples).toHaveLength(0);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});
