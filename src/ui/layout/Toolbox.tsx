import { SnapIncrementMm, Tool } from "../../model/types";

type ToolboxProps = {
  activeTool: Tool;
  snapToGrid: boolean;
  snapToObjects: boolean;
  snapIncrementMm: SnapIncrementMm;
  onToggleSnapToGrid: () => void;
  onToggleSnapToObjects: () => void;
  onSetSnapIncrement: (stepMm: SnapIncrementMm) => void;
  onSetActiveTool: (tool: Tool) => void;
};

export default function Toolbox({
  activeTool,
  snapToGrid,
  snapToObjects,
  snapIncrementMm,
  onToggleSnapToGrid,
  onToggleSnapToObjects,
  onSetSnapIncrement,
  onSetActiveTool,
}: ToolboxProps) {
  const renderButton = (tool: Tool, label: string) => (
    <button
      key={tool}
      className={`toolbox__btn ${activeTool === tool ? "isActive" : ""}`}
      type="button"
      onClick={() => onSetActiveTool(tool)}
    >
      {label}
    </button>
  );

  return (
    <div className="toolbox">
      <div className="toolbox__header">Toolbox</div>
      <div className="toolbox__group">
        <div className="toolbox__row">
          {renderButton("ramp", "Ramp")}
          {renderButton("landing", "Landing (Platform)")}
          {renderButton("dimension", "Dimension")}
          {renderButton("delete", "Delete")}
        </div>
        <div className="toolbox__stackedControls">
          <label className="snap-toggle">
            <input type="checkbox" checked={snapToGrid} onChange={onToggleSnapToGrid} />
            Snap to Grid
          </label>
          <label className="snap-toggle">
            <input type="checkbox" checked={snapToObjects} onChange={onToggleSnapToObjects} />
            Snap to Objects
          </label>
          <label className="snap-toggle">
            <span style={{ marginRight: 8 }}>Snap Increment</span>
            <select value={snapIncrementMm} onChange={(evt) => onSetSnapIncrement(Number(evt.target.value) as SnapIncrementMm)}>
              <option value={1}>1mm</option>
              <option value={10}>10mm</option>
              <option value={100}>100mm</option>
              <option value={1000}>1000mm</option>
            </select>
          </label>
        </div>
        <div className="toolbox__hint">Tip: Click to select. Shortcuts: R, P (Landing), M (Dimension), D, Esc, Backspace, arrows.</div>
      </div>
    </div>
  );
}
