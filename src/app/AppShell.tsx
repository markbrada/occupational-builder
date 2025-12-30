import { useState } from "react";
import Inspector from "../ui/layout/Inspector";
import TopBar from "../ui/layout/TopBar";
import Toolbox from "../ui/layout/Toolbox";
import Canvas2D from "../ui/canvas/Canvas2D";
import Preview3D from "../ui/preview/Preview3D";
import "./styles.css";

export type EditMode = "2d" | "3d";

export default function AppShell() {
  const [mode, setMode] = useState<EditMode>("2d");
  const [snapOn, setSnapOn] = useState(false);

  const handleToggleSnap = () => setSnapOn((prev) => !prev);

  return (
    <div className="ob-root">
      <div className="ob-top">
        <TopBar mode={mode} onSetMode={setMode} />
      </div>
      <div className="ob-main">
        <aside className="ob-left ob-panel">
          <Toolbox snapOn={snapOn} onToggleSnap={handleToggleSnap} />
        </aside>
        <main className="ob-center ob-panel">
          {mode === "2d" ? <Canvas2D /> : <Preview3D />}
        </main>
        <aside className="ob-right ob-panel">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}
