import { APP_VERSION } from "../../app/version";
import { EditMode } from "../../app/AppShell";

type TopBarProps = {
  mode: EditMode;
  onSetMode: (mode: EditMode) => void;
  snapOn: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export default function TopBar({
  mode,
  onSetMode,
  snapOn,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__left">
        <h1 className="top-bar__title">Occupational Builder v{APP_VERSION}</h1>
        <div className="top-bar__history">
          <button type="button" className="mode-button mode-button--ghost" onClick={onUndo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="mode-button mode-button--ghost" onClick={onRedo} disabled={!canRedo}>
            Redo
          </button>
        </div>
      </div>
      <div className="top-bar__actions">
        <div className={`top-bar__snap ${snapOn ? "top-bar__snap--on" : "top-bar__snap--off"}`} aria-live="polite">
          Snap {snapOn ? "ON" : "OFF"}
        </div>
        <div className="top-bar__modes">
          <button
            type="button"
            className={`mode-button ${mode === "2d" ? "mode-button--active" : ""}`}
            onClick={() => onSetMode("2d")}
          >
            Edit in 2D
          </button>
          <button
            type="button"
            className={`mode-button ${mode === "3d" ? "mode-button--active" : ""}`}
            onClick={() => onSetMode("3d")}
          >
            Edit in 3D
          </button>
        </div>
      </div>
    </header>
  );
}
