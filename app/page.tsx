"use client";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { PadGrid } from "@/components/PadGrid";
import { EditorPanel } from "@/components/EditorPanel";
import { Visualizer } from "@/components/Visualizer";
import { StorageBootstrap } from "@/components/StorageBootstrap";
import { useKeyboardTrigger } from "@/hooks/useKeyboardTrigger";

export default function Page() {
  useKeyboardTrigger();
  return (
    <div
      className="grid h-screen p-2 gap-2 overflow-hidden"
      style={{
        gridTemplateColumns: "200px 1fr 380px",
        gridTemplateRows: "70px minmax(0, 1fr) 260px",
        gridTemplateAreas: `"header header header" "sidebar pads editor" "viz viz viz"`,
      }}
    >
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ gridArea: "header" }}>
        <Header />
      </div>
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ gridArea: "sidebar" }}>
        <Sidebar />
      </div>
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ gridArea: "pads" }}>
        <PadGrid />
      </div>
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ gridArea: "editor" }}>
        <EditorPanel />
      </div>
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ gridArea: "viz" }}>
        <Visualizer />
      </div>
      <StorageBootstrap />
    </div>
  );
}
