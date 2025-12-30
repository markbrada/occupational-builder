import { APP_VERSION } from "../../app/version";
import { EditMode } from "../../app/AppShell";

type TopBarProps = {
  mode: EditMode;
  onSetMode: (mode: EditMode) => void;
  canRotate: boolean;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  snapOn: boolean;
};

export default function TopBar({ mode, onSetMode, canRotate, onRotateLeft, onRotateRight, snapOn }: TopBarProps) {
  return (
    <header className="top-bar">
      <h1 className="top-bar__title">Occupational Builder v{APP_VERSION}</h1>
      <div className="top-bar__actions">
        <div className={`top-bar__snap ${snapOn ? "top-bar__snap--on" : "top-bar__snap--off"}`} aria-live="polite">
          Snap {snapOn ? "ON" : "OFF"}
        </div>
        <div className="top-bar__rotations">
          <button type="button" className="mode-button mode-button--ghost" onClick={onRotateLeft} disabled={!canRotate}>
            Rotate -90°
          </button>
          <button type="button" className="mode-button mode-button--ghost" onClick={onRotateRight} disabled={!canRotate}>
            Rotate +90°
          </button>
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
