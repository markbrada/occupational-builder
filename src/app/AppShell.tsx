import { useEffect, useMemo, useState } from "react";
import { newPlatformAt, newRampAt } from "../model/defaults";
import { SNAP_MM } from "../model/constants";
import { Object2D, Tool } from "../model/types";
import Canvas2D from "../ui/canvas/Canvas2D";
import Preview3D from "../ui/preview/Preview3D";
import Inspector from "../ui/layout/Inspector";
import TopBar from "../ui/layout/TopBar";
import Toolbox from "../ui/layout/Toolbox";
import "./styles.css";

export type EditMode = "2d" | "3d";

const statusText: Record<Tool, string> = {
  none: "No tool selected. Click any object to select. Shortcuts: R, P, D, Esc.",
  ramp: "Ramp: Click on empty canvas to place once. Esc to cancel.",
  platform: "Platform: Click on empty canvas to place once. Esc to cancel.",
  delete: "Delete: Click an object to delete, or Esc to cancel.",
};

export default function AppShell() {
  const [mode, setMode] = useState<EditMode>("2d");
  const [activeTool, setActiveTool] = useState<Tool>("none");
  const [snapOn, setSnapOn] = useState(true);
  const [objects, setObjects] = useState<Object2D[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleToggleSnap = () => setSnapOn((prev) => !prev);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(activeTag)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (event.key === "Escape") {
        setActiveTool("none");
        return;
      }
      if (key === "r") setActiveTool("ramp");
      if (key === "p") setActiveTool("platform");
      if (key === "d") setActiveTool("delete");
      if (event.key === "Backspace") {
        if (selectedId) {
          event.preventDefault();
          handleDeleteObject(selectedId);
        }
        setActiveTool("none");
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        if (!selectedId) return;
        setObjects((prev) =>
          prev.map((obj) => {
            if (obj.id !== selectedId || obj.locked) return obj;
            if (event.key === "ArrowUp") return { ...obj, yMm: obj.yMm - SNAP_MM };
            if (event.key === "ArrowDown") return { ...obj, yMm: obj.yMm + SNAP_MM };
            if (event.key === "ArrowLeft") return { ...obj, xMm: obj.xMm - SNAP_MM };
            if (event.key === "ArrowRight") return { ...obj, xMm: obj.xMm + SNAP_MM };
            return obj;
          }),
        );
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId]);

  const status = useMemo(() => statusText[activeTool], [activeTool]);

  const handlePlaceAt = (tool: Tool, xMm: number, yMm: number) => {
    if (tool === "ramp") {
      const ramp = newRampAt(xMm, yMm);
      setObjects((prev) => [...prev, ramp]);
      setSelectedId(ramp.id);
    }
    if (tool === "platform") {
      const platform = newPlatformAt(xMm, yMm);
      setObjects((prev) => [...prev, platform]);
      setSelectedId(platform.id);
    }
    setActiveTool("none");
  };

  const handleUpdateObject = (id: string, updater: (obj: Object2D) => Object2D) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? updater(obj) : obj)));
  };

  const handleDeleteObject = (id: string) => {
    setObjects((prev) => prev.filter((obj) => obj.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const handleClearSelection = () => setSelectedId(null);

  const handleRotateSelected = (delta: number) => {
    if (!selectedId) return;
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedId) return obj;
        const startingRotation = snapOn ? Math.round(obj.rotationDeg / 90) * 90 : obj.rotationDeg;
        const nextRotation = ((startingRotation + delta) % 360 + 360) % 360;
        return { ...obj, rotationDeg: nextRotation };
      }),
    );
  };

  return (
    <div className="ob-root">
      <div className="ob-top">
        <TopBar
          mode={mode}
          onSetMode={setMode}
          canRotate={Boolean(selectedId)}
          onRotateLeft={() => handleRotateSelected(-90)}
          onRotateRight={() => handleRotateSelected(90)}
          snapOn={snapOn}
        />
      </div>
      <div className="ob-main">
        <aside className="ob-left ob-panel">
          <Toolbox
            activeTool={activeTool}
            snapOn={snapOn}
            onToggleSnap={handleToggleSnap}
            onSetActiveTool={setActiveTool}
          />
        </aside>
        <main className="ob-center ob-panel">
          {mode === "2d" ? (
            <Canvas2D
              activeTool={activeTool}
              snapOn={snapOn}
              objects={objects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onClearSelection={handleClearSelection}
              onPlaceAt={handlePlaceAt}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              onSetActiveTool={setActiveTool}
            />
          ) : (
            <Preview3D />
          )}
        </main>
        <aside className="ob-right ob-panel">
          <Inspector />
        </aside>
      </div>
      <div className="ob-statusBar">
        <div className="ob-statusBar__mode">Mode: {activeTool.toUpperCase()}</div>
        <div className="ob-statusBar__hint">{status}</div>
      </div>
    </div>
  );
}
