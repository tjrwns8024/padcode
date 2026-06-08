"use client";
import { useEffect } from "react";
import { useCellsStore } from "@/stores/cells";
import { usePresetsStore } from "@/stores/presets";

// 두 스토어는 skipHydration 으로 생성되므로, 클라이언트 마운트 후에만
// localStorage 에서 복원한다. 이렇게 해야 서버/초기 클라이언트 렌더가
// 동일(빈 그리드)해 하이드레이션 미스매치가 발생하지 않는다.
export function StorageBootstrap() {
  useEffect(() => {
    useCellsStore.persist.rehydrate();
    usePresetsStore.persist.rehydrate();
  }, []);
  return null;
}
