"use client";
import { useEffect } from "react";
import { eventToCellId } from "@/lib/keymap";
import { ensureAudioContext, triggerCellCode } from "@/lib/audio/engine";
import { useCellsStore } from "@/stores/cells";
import { useUIStore } from "@/stores/ui";

const pressed = new Set<string>();

function isEditorFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (active.closest?.(".cm-editor")) return true;
  if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") return true;
  return false;
}

export function useKeyboardTrigger() {
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isEditorFocused()) return;
      if (e.repeat) return;

      // Delete/Backspace clears selected pad's code
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = useUIStore.getState().selectedCellId;
        if (selected) {
          e.preventDefault();
          useCellsStore.getState().clearCode(selected);
        }
        return;
      }

      const id = eventToCellId(e);
      if (!id) return;

      const dedupeKey = e.code || e.key.toLowerCase();
      if (pressed.has(dedupeKey)) return;
      pressed.add(dedupeKey);
      e.preventDefault();

      const cell = useCellsStore.getState().cells[id];
      if (!cell || !cell.code.trim()) return;

      ensureAudioContext().then(() => {
        triggerCellCode(id, cell.code);
        useUIStore.getState().pulse(id);
      });
    };
    const onUp = (e: KeyboardEvent) => {
      pressed.delete(e.code || e.key.toLowerCase());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
}
