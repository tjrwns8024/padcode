"use client";
import { useRef, useState } from "react";
import { useCellsStore, type GridSnapshot } from "@/stores/cells";
import { usePresetsStore, type GridPreset } from "@/stores/presets";

// 현재 16칸 그리드를 편집 필드만 추려 스냅샷으로 만든다.
function currentSnapshot(): GridSnapshot {
  const cells = useCellsStore.getState().cells;
  const snap: GridSnapshot = {};
  for (const [id, c] of Object.entries(cells)) {
    snap[id] = { code: c.code, playMode: c.playMode, looping: c.looping };
  }
  return snap;
}

export function SetList() {
  const presets = usePresetsStore((s) => s.presets);
  const savePreset = usePresetsStore((s) => s.savePreset);
  const renamePreset = usePresetsStore((s) => s.renamePreset);
  const deletePreset = usePresetsStore((s) => s.deletePreset);
  const loadSnapshot = useCellsStore((s) => s.loadSnapshot);

  const [name, setName] = useState("");
  // 이름 수정 중인 프리셋 id 와 입력값
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  // 단일클릭(LOAD)과 더블클릭(이름 수정)을 구분하기 위한 지연 타이머.
  // 더블클릭이면 예약된 LOAD 를 취소해 현재 그리드가 덮어써지지 않게 한다.
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSave = () => {
    const snapshot = currentSnapshot();
    // 빈 그리드는 저장하지 않는다(빈 세트가 쌓이는 것 방지).
    const hasContent = Object.values(snapshot).some((c) => c.code.trim());
    if (!hasContent) return;

    const trimmed = name.trim() || `SET ${presets.length + 1}`;
    savePreset(trimmed, snapshot);
    // 저장 후 그리드를 비워 곧바로 새 세트를 처음부터 만들 수 있게 한다.
    // 방금 저장한 세트는 LOAD 로 언제든 복원 가능.
    loadSnapshot({});
    setName("");
  };

  const onNameClick = (p: GridPreset) => {
    // 더블클릭 대기 중이면 두 번째 클릭은 무시(더블클릭 핸들러가 처리).
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      loadSnapshot(p.snapshot);
    }, 220);
  };

  const startEdit = (p: GridPreset) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setEditingId(p.id);
    setEditName(p.name);
  };

  const commitEdit = () => {
    if (editingId) {
      const trimmed = editName.trim();
      if (trimmed) renamePreset(editingId, trimmed);
    }
    setEditingId(null);
  };

  // 저장하지 않고 그리드만 비워 새 세트를 시작한다.
  // 프리셋을 LOAD 해서 본 뒤 빈 패드로 돌아올 때 사용.
  const onNew = () => {
    loadSnapshot({});
    setName("");
  };

  return (
    <div className="mb-2 pb-3 border-b-2 border-dotted border-arcade-dim">
      <div className="text-[9px] tracking-[1.5px] text-arcade-pac text-center mb-2">
        SET LIST ({presets.length})
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          placeholder="세트 이름..."
          className="flex-1 min-w-0 bg-transparent border border-arcade-dim text-arcade-phosphor text-[9px] tracking-[0.5px] px-2 py-1 placeholder:text-arcade-dim/50 outline-none focus:border-arcade-pac font-crt"
        />
        <button
          onClick={onSave}
          title="현재 그리드를 세트로 저장하고 칸을 비웁니다"
          className="px-2 py-1 border border-arcade-pac text-arcade-pac text-[8px] tracking-[1px] hover:bg-arcade-pac hover:text-arcade-bg transition-colors whitespace-nowrap"
        >
          + SAVE
        </button>
      </div>

      <button
        onClick={onNew}
        title="저장하지 않고 빈 그리드로 새 세트를 시작합니다"
        className="w-full mt-1.5 py-1 border border-arcade-dim text-arcade-dim text-[8px] tracking-[1.5px] hover:border-arcade-pac hover:text-arcade-pac transition-colors"
      >
        NEW · 빈 그리드로 시작
      </button>

      {presets.length === 0 ? (
        <div className="text-[8px] tracking-[1px] text-arcade-dim mt-2 leading-relaxed">
          현재 그리드를 세트로 저장하면 칸이 비워지고, 새로고침 후에도 LOAD 로 다시 불러올 수 있어요
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          {presets.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 border-2 border-transparent hover:border-arcade-dim"
            >
              {editingId === p.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editName}
                  aria-label={`rename ${p.name}`}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={commitEdit}
                  className="flex-1 min-w-0 mx-1.5 my-1 bg-transparent border border-arcade-pac text-arcade-phosphor text-[9px] tracking-[1px] px-1.5 py-1 outline-none font-crt"
                />
              ) : (
                <button
                  onClick={() => onNameClick(p)}
                  onDoubleClick={() => startEdit(p)}
                  title={`${p.name} — 클릭: 불러오기 / 더블클릭: 이름 수정`}
                  className="flex items-center gap-2 px-1.5 py-2 flex-1 min-w-0 text-left text-[9px] tracking-[1px] text-arcade-dot hover:text-arcade-pac cursor-pointer overflow-hidden"
                >
                  <span className="text-arcade-pac flex-shrink-0">▸</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-[7px] text-arcade-dim flex-shrink-0">LOAD</span>
                </button>
              )}
              <button
                onClick={() => deletePreset(p.id)}
                aria-label={`delete ${p.name}`}
                className="text-[10px] text-arcade-dim hover:text-arcade-red px-1.5 py-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
