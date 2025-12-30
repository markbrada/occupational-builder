import { useState } from "react";
import Inspector from "../ui/layout/Inspector";
import TopBar from "../ui/layout/TopBar";
import Toolbox from "../ui/layout/Toolbox";
import Canvas2D from "../ui/canvas/Canvas2D";
import Preview3D from "../ui/preview/Preview3D";
import { CanvasObject2D, Tool } from "../model/types";
import { makeDefaultPlatform, makeDefaultRamp } from "../model/defaults";
import "./styles.css";

export type EditMode = "2d" | "3d";

export default function AppShell() {
  const [mode, setMode] = useState<EditMode>("2d");
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [snapOn, setSnapOn] = useState(true);
  const [objects, setObjects] = useState<CanvasObject2D[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleToggleSnap = () => setSnapOn((prev) => !prev);

  const handlePlaceObject = (tool: Tool, positionMm: { xMm: number; yMm: number }) => {
    if (tool === "ramp") {
      setObjects((prev) => {
        const ramp = makeDefaultRamp(positionMm);
        setSelectedId(ramp.id);
        return [...prev, ramp];
      });
      return;
    }

    if (tool === "platform") {
      setObjects((prev) => {
        const platform = makeDefaultPlatform(positionMm);
        setSelectedId(platform.id);
        return [...prev, platform];
      });
    }
  };

  const handleSelectObject = (id: string | null) => {
    setSelectedId(id);
  };

  const handleDeleteObject = (id: string) => {
    setObjects((prev) => prev.filter((object) => object.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const handleMoveObject = (id: string, positionMm: { xMm: number; yMm: number }) => {
    setObjects((prev) =>
      prev.map((object) => (object.id === id ? { ...object, ...positionMm } : object)),
    );
  };

  return (
    <div className="ob-root">
      <div className="ob-top">
        <TopBar mode={mode} onSetMode={setMode} />
      </div>
      <div className="ob-main">
        <aside className="ob-left ob-panel">
          <Toolbox
            activeTool={activeTool}
            snapOn={snapOn}
            onToggleSnap={handleToggleSnap}
            onSelectTool={setActiveTool}
          />
        </aside>
        <main className="ob-center ob-panel">
          {mode === "2d" ? (
            <Canvas2D
              activeTool={activeTool}
              snapOn={snapOn}
              objects={objects}
              selectedId={selectedId}
              onPlaceObject={handlePlaceObject}
              onSelectObject={handleSelectObject}
              onDeleteObject={handleDeleteObject}
              onMoveObject={handleMoveObject}
            />
          ) : (
            <Preview3D />
          )}
        </main>
        <aside className="ob-right ob-panel">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}
