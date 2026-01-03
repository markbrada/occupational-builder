import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newPlatformAt, newRampAt } from "../model/defaults";
import { Object2D, Tool } from "../model/types";
import { centerFromTopLeftMm, getObjectBoundingBoxMm, topLeftFromCenterMm } from "../model/geometry";
import { PersistedProject, loadProject, saveProject } from "../model/storage";
import { GRID_STEP_MM, snapMm } from "../model/units";
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

const FINE_NUDGE_MM = 10;

export default function AppShell() {
  const [mode, setMode] = useState<EditMode>("2d");
  const [activeTool, setActiveTool] = useState<Tool>("none");
  const [snapOn, setSnapOn] = useState(true);
  const [objects, setObjects] = useState<Object2D[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const restored = loadProject();
    if (restored) {
      setMode(restored.mode);
      setActiveTool(restored.activeTool);
      setSnapOn(restored.snapOn);
      setObjects(restored.objects);
      setSelectedId(restored.selectedId);
    }
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const scheduleSave = useCallback(
    (overrides: Partial<PersistedProject> = {}) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }

      const snapshot: PersistedProject = {
        mode,
        activeTool,
        snapOn,
        objects,
        selectedId,
        ...overrides,
      };

      saveTimerRef.current = window.setTimeout(() => {
        saveProject(snapshot);
        saveTimerRef.current = null;
      }, 200);
    },
    [mode, activeTool, snapOn, objects, selectedId],
  );

  const handleToggleSnap = () => {
    setSnapOn((prev) => {
      const next = !prev;
      scheduleSave({ snapOn: next });
      return next;
    });
  };

  const handleSetMode = (nextMode: EditMode) => {
    setMode(nextMode);
    scheduleSave({ mode: nextMode });
  };

  const status = useMemo(() => statusText[activeTool], [activeTool]);

  const handlePlaceAt = (tool: Tool, xMm: number, yMm: number) => {
    if (tool === "ramp") {
      const ramp = newRampAt(xMm, yMm);
      setObjects((prev) => {
        const next = [...prev, ramp];
        scheduleSave({ objects: next, selectedId: ramp.id, activeTool: "none" });
        return next;
      });
      setSelectedId(ramp.id);
    }
    if (tool === "platform") {
      const platform = newPlatformAt(xMm, yMm);
      setObjects((prev) => {
        const next = [...prev, platform];
        scheduleSave({ objects: next, selectedId: platform.id, activeTool: "none" });
        return next;
      });
      setSelectedId(platform.id);
    }
    setActiveTool("none");
  };

  const handleUpdateObject = (id: string, updater: (obj: Object2D) => Object2D) => {
    setObjects((prev) => {
      const next = prev.map((obj) => (obj.id === id ? updater(obj) : obj));
      scheduleSave({ objects: next });
      return next;
    });
  };

  const handleDeleteObject = (id: string) => {
    setObjects((prev) => {
      const nextObjects = prev.filter((obj) => obj.id !== id);
      setSelectedId((currentSelected) => {
        const nextSelected = currentSelected === id ? null : currentSelected;
        scheduleSave({ objects: nextObjects, selectedId: nextSelected });
        return nextSelected;
      });
      return nextObjects;
    });
  };

  const handleClearSelection = () => {
    setSelectedId((prev) => {
      if (prev !== null) {
        scheduleSave({ selectedId: null });
      }
      return null;
    });
  };

  const handleRotateSelected = (delta: number) => {
    if (!selectedId) return;
    setObjects((prev) => {
      const next = prev.map((obj) => {
        if (obj.id !== selectedId) return obj;
        const startingRotation = snapOn ? Math.round(obj.rotationDeg / 90) * 90 : obj.rotationDeg;
        const nextRotation = ((startingRotation + delta) % 360 + 360) % 360;
        return { ...obj, rotationDeg: nextRotation };
      });
      scheduleSave({ objects: next });
      return next;
    });
  };

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
        setObjects((prev) => {
          const next = prev.map((obj) => {
            if (obj.id !== selectedId || obj.locked) return obj;
            const bbox = getObjectBoundingBoxMm(obj);
            const currentTopLeft = topLeftFromCenterMm({ xMm: obj.xMm, yMm: obj.yMm }, bbox);
            const nudgeStep = snapOn ? GRID_STEP_MM : FINE_NUDGE_MM;
            const offset = { xMm: 0, yMm: 0 };
            if (event.key === "ArrowUp") offset.yMm = -nudgeStep;
            if (event.key === "ArrowDown") offset.yMm = nudgeStep;
            if (event.key === "ArrowLeft") offset.xMm = -nudgeStep;
            if (event.key === "ArrowRight") offset.xMm = nudgeStep;
            if (offset.xMm === 0 && offset.yMm === 0) return obj;
            const nextTopLeft = { xMm: currentTopLeft.xMm + offset.xMm, yMm: currentTopLeft.yMm + offset.yMm };
            const snappedTopLeft = snapOn
              ? { xMm: snapMm(nextTopLeft.xMm), yMm: snapMm(nextTopLeft.yMm) }
              : nextTopLeft;
            const nextCenter = centerFromTopLeftMm(snappedTopLeft, bbox);
            return { ...obj, xMm: nextCenter.xMm, yMm: nextCenter.yMm };
          });
          scheduleSave({ objects: next });
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, scheduleSave, handleDeleteObject, snapOn]);

  return (
    <div className="ob-root">
      <div className="ob-top">
        <TopBar
          mode={mode}
          onSetMode={handleSetMode}
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
