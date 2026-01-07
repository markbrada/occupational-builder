import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newLandingAt, newRampAt } from "../model/defaults";
import { updateObject, type ObjectPatch } from "../model/objectUpdate";
import { Snapshot, SnapIncrementMm, Tool } from "../model/types";
import { centerFromTopLeftMm, getObjectBoundingBoxMm, topLeftFromCenterMm } from "../model/geometry";
import { loadProject, saveProject } from "../model/storage";
import { DEFAULT_SNAP_INCREMENT_MM, snapMm } from "../model/units";
import { HistoryState, canRedo, canUndo, commitSnapshot, createHistoryState, redo, replacePresent, undo } from "../model/history";
import Canvas2D from "../ui/canvas/Canvas2D";
import Preview3D from "../ui/preview/Preview3D";
import Inspector from "../ui/layout/Inspector";
import TopBar from "../ui/layout/TopBar";
import Toolbox from "../ui/layout/Toolbox";
import "./styles.css";

export type EditMode = "2d" | "3d";

const statusText: Record<Tool, string> = {
  none: "No tool selected. Click any object to select. Shortcuts: R (Ramp), P (Landing), D, Esc.",
  ramp: "Ramp: Click on empty canvas to place once. Esc to cancel.",
  landing: "Landing: Click on empty canvas to place once. Esc to cancel.",
  delete: "Delete: Click an object to delete, or Esc to cancel.",
};

const defaultSnapshot: Snapshot = {
  snapToGrid: true,
  snapToObjects: true,
  snapIncrementMm: DEFAULT_SNAP_INCREMENT_MM,
  objects: [],
  selectedId: null,
};

export default function AppShell() {
  const [mode, setMode] = useState<EditMode>("2d");
  const [activeTool, setActiveTool] = useState<Tool>("none");
  const [history, setHistory] = useState<HistoryState>(() => createHistoryState(defaultSnapshot));

  const { objects, selectedId, snapToGrid, snapToObjects, snapIncrementMm } = history.present;

  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const restored = loadProject();
    if (restored) {
      setMode(restored.mode);
      setActiveTool(restored.activeTool);
      setHistory(
        createHistoryState({
          objects: restored.objects,
          snapToGrid: restored.snapToGrid,
          snapToObjects: restored.snapToObjects,
          snapIncrementMm: restored.snapIncrementMm,
          selectedId: restored.selectedId,
        }),
      );
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

  useEffect(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    const snapshot = { mode, activeTool, objects, snapToGrid, snapToObjects, snapIncrementMm, selectedId };

    saveTimerRef.current = window.setTimeout(() => {
      saveProject(snapshot);
      saveTimerRef.current = null;
    }, 200);
  }, [mode, activeTool, objects, snapIncrementMm, snapToGrid, snapToObjects, selectedId]);

  const applySnapshot = useCallback(
    (updater: (snapshot: Snapshot) => Snapshot, commitChange = false) => {
      setHistory((current) => {
        const updated = updater(current.present);
        if (updated === current.present) return current;
        return commitChange ? commitSnapshot(current, updated) : replacePresent(current, updated);
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setHistory((current) => (canUndo(current) ? undo(current) : current));
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((current) => (canRedo(current) ? redo(current) : current));
  }, []);

  const handleToggleSnapToGrid = () => {
    applySnapshot((present) => ({ ...present, snapToGrid: !present.snapToGrid }), true);
  };

  const handleToggleSnapToObjects = () => {
    applySnapshot((present) => ({ ...present, snapToObjects: !present.snapToObjects }), true);
  };

  const handleSetSnapIncrement = (stepMm: SnapIncrementMm) => {
    applySnapshot((present) => ({ ...present, snapIncrementMm: stepMm }), true);
  };

  const handleSetMode = (nextMode: EditMode) => {
    setMode(nextMode);
  };

  const handleSelect = useCallback(
    (id: string) => {
      applySnapshot((present) => (present.selectedId === id ? present : { ...present, selectedId: id }));
    },
    [applySnapshot],
  );

  const status = useMemo(() => statusText[activeTool], [activeTool]);
  const snapStatus = useMemo(() => {
    if (snapToGrid && snapToObjects) return `Grid (${snapIncrementMm}mm) + Objects`;
    if (snapToGrid) return `Grid (${snapIncrementMm}mm)`;
    if (snapToObjects) return "Objects only";
    return "Free (1mm)";
  }, [snapIncrementMm, snapToGrid, snapToObjects]);

  const handlePlaceAt = useCallback(
    (tool: Tool, xMm: number, yMm: number) => {
      if (tool === "ramp") {
        const ramp = newRampAt(xMm, yMm);
        applySnapshot(
          (present) => ({ ...present, objects: [...present.objects, ramp], selectedId: ramp.id }),
          true,
        );
        setActiveTool("none");
        return;
      }
      if (tool === "landing") {
        const landing = newLandingAt(xMm, yMm);
        applySnapshot(
          (present) => ({ ...present, objects: [...present.objects, landing], selectedId: landing.id }),
          true,
        );
        setActiveTool("none");
        return;
      }
    },
    [applySnapshot],
  );

  const handleUpdateObject = useCallback(
    (id: string, patch: ObjectPatch, commitChange = false) => {
      applySnapshot((present) => updateObject(present, id, patch), commitChange);
    },
    [applySnapshot],
  );

  const handleDeleteObject = useCallback(
    (id: string) => {
      applySnapshot((present) => {
        const nextObjects = present.objects.filter((obj) => obj.id !== id);
        if (nextObjects.length === present.objects.length) return present;
        const nextSelected = present.selectedId === id ? null : present.selectedId;
        return { ...present, objects: nextObjects, selectedId: nextSelected };
      }, true);
    },
    [applySnapshot],
  );

  const handleClearSelection = useCallback(() => {
    applySnapshot((present) => {
      if (present.selectedId === null) return present;
      return { ...present, selectedId: null };
    });
  }, [applySnapshot]);

  const handleRotateSelected = useCallback(
    (delta: number) => {
      applySnapshot((present) => {
        if (!present.selectedId) return present;
        const selected = present.objects.find((obj) => obj.id === present.selectedId);
        if (!selected || selected.locked) return present;
        const hasSnap = present.snapToGrid || present.snapToObjects;
        const startingRotation = hasSnap ? Math.round(selected.rotationDeg / 90) * 90 : selected.rotationDeg;
        const nextRotation = startingRotation + delta;
        return updateObject(present, selected.id, { rotationDeg: nextRotation });
      }, true);
    },
    [applySnapshot],
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = (activeEl?.tagName || "").toLowerCase();
      const isTyping = ["input", "textarea", "select"].includes(activeTag) || activeEl?.isContentEditable;
      if (isTyping) return;

      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === "Escape") {
        setActiveTool("none");
        return;
      }
      if (key === "r") setActiveTool("ramp");
      if (key === "p") setActiveTool("landing");
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
        applySnapshot((present) => {
          const selected = present.selectedId
            ? present.objects.find((obj) => obj.id === present.selectedId)
            : null;
          if (!selected || selected.locked) return present;
          const bbox = getObjectBoundingBoxMm(selected);
          const currentTopLeft = topLeftFromCenterMm({ xMm: selected.xMm, yMm: selected.yMm }, bbox);
          const nudgeStep = present.snapToGrid ? present.snapIncrementMm : 1;
          const offset = { xMm: 0, yMm: 0 };
          if (event.key === "ArrowUp") offset.yMm = -nudgeStep;
          if (event.key === "ArrowDown") offset.yMm = nudgeStep;
          if (event.key === "ArrowLeft") offset.xMm = -nudgeStep;
          if (event.key === "ArrowRight") offset.xMm = nudgeStep;
          const nextTopLeft = { xMm: currentTopLeft.xMm + offset.xMm, yMm: currentTopLeft.yMm + offset.yMm };
          const snapStepMm = present.snapToGrid ? present.snapIncrementMm : 1;
          const snappedTopLeft = {
            xMm: snapMm(nextTopLeft.xMm, snapStepMm),
            yMm: snapMm(nextTopLeft.yMm, snapStepMm),
          };
          const nextCenter = centerFromTopLeftMm(snappedTopLeft, bbox);
          return updateObject(present, selected.id, { xMm: nextCenter.xMm, yMm: nextCenter.yMm });
        }, true);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [applySnapshot, handleDeleteObject, handleRedo, handleUndo, selectedId]);

  const canUndoAction = canUndo(history);
  const canRedoAction = canRedo(history);
  const selectedObject = selectedId ? objects.find((obj) => obj.id === selectedId) ?? null : null;

  return (
    <div className="ob-root">
      <div className="ob-top">
        <TopBar
          mode={mode}
          onSetMode={handleSetMode}
          snapLabel={snapStatus}
          snapActive={snapToGrid || snapToObjects}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndoAction}
          canRedo={canRedoAction}
        />
      </div>
      <div className="ob-main">
        <aside className="ob-left ob-panel">
          <Toolbox
            activeTool={activeTool}
            snapToGrid={snapToGrid}
            snapToObjects={snapToObjects}
            snapIncrementMm={snapIncrementMm}
            onToggleSnapToGrid={handleToggleSnapToGrid}
            onToggleSnapToObjects={handleToggleSnapToObjects}
            onSetSnapIncrement={handleSetSnapIncrement}
            onSetActiveTool={setActiveTool}
          />
        </aside>
        <main className="ob-center ob-panel">
          {mode === "2d" ? (
            <Canvas2D
              activeTool={activeTool}
              snapToGrid={snapToGrid}
              snapToObjects={snapToObjects}
              snapIncrementMm={snapIncrementMm}
              objects={objects}
              selectedId={selectedId}
              onSelect={handleSelect}
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
          <Inspector selected={selectedObject} onUpdateObject={handleUpdateObject} onRotateSelected={handleRotateSelected} />
        </aside>
      </div>
      <div className="ob-statusBar">
        <div className="ob-statusBar__mode">Mode: {activeTool.toUpperCase()}</div>
        <div className="ob-statusBar__snap">Snap: {snapStatus}</div>
        <div className="ob-statusBar__hint">{status}</div>
      </div>
    </div>
  );
}
