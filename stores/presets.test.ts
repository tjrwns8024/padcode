import { beforeEach, describe, expect, it } from "vitest";
import { usePresetsStore } from "@/stores/presets";
import type { GridSnapshot } from "@/stores/cells";

beforeEach(() => {
  usePresetsStore.setState({ presets: [] });
});

function snap(code: string): GridSnapshot {
  return { r0c0: { code, playMode: "oneshot", looping: false } };
}

describe("savePreset", () => {
  it("이름과 스냅샷으로 프리셋을 추가한다", () => {
    usePresetsStore.getState().savePreset("beat A", snap('샘플("kick")'));
    const { presets } = usePresetsStore.getState();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe("beat A");
    expect(presets[0].snapshot.r0c0.code).toBe('샘플("kick")');
    expect(presets[0].id).toBeTruthy();
    expect(typeof presets[0].createdAt).toBe("number");
  });

  it("여러 개를 누적하고 각각 고유 id 를 갖는다", () => {
    const { savePreset } = usePresetsStore.getState();
    savePreset("a", snap("사인파(440)"));
    savePreset("b", snap("노이즈()"));
    const { presets } = usePresetsStore.getState();
    expect(presets.map((p) => p.name)).toEqual(["a", "b"]);
    expect(presets[0].id).not.toBe(presets[1].id);
  });
});

describe("renamePreset", () => {
  it("id 에 해당하는 프리셋의 이름만 바꾼다", () => {
    const { savePreset } = usePresetsStore.getState();
    savePreset("a", snap("사인파(440)"));
    savePreset("b", snap("노이즈()"));
    const targetId = usePresetsStore.getState().presets[0].id;

    usePresetsStore.getState().renamePreset(targetId, "renamed");

    const { presets } = usePresetsStore.getState();
    expect(presets[0].name).toBe("renamed");
    expect(presets[1].name).toBe("b");
    // 스냅샷/ id 는 보존된다
    expect(presets[0].id).toBe(targetId);
    expect(presets[0].snapshot.r0c0.code).toBe("사인파(440)");
  });
});

describe("deletePreset", () => {
  it("id 로 해당 프리셋만 삭제한다", () => {
    const { savePreset } = usePresetsStore.getState();
    savePreset("a", snap("사인파(440)"));
    savePreset("b", snap("노이즈()"));
    const targetId = usePresetsStore.getState().presets[0].id;

    usePresetsStore.getState().deletePreset(targetId);

    const { presets } = usePresetsStore.getState();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe("b");
  });

  it("존재하지 않는 id 를 삭제해도 안전하다", () => {
    usePresetsStore.getState().savePreset("a", snap("사인파(440)"));
    usePresetsStore.getState().deletePreset("nope");
    expect(usePresetsStore.getState().presets).toHaveLength(1);
  });
});
