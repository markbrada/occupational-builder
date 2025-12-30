import { EditMode } from "../../app/AppShell";

type TopBarProps = {
  mode: EditMode;
  onSetMode: (mode: EditMode) => void;
};

export default function TopBar({ mode, onSetMode }: TopBarProps) {
  return (
    <header className="top-bar">
      <h1 className="top-bar__title">Occupational Builder</h1>
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
    </header>
  );
}
