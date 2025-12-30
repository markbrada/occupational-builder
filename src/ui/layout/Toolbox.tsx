import { ActiveTool, Tool } from "../../model/types";

type ToolboxProps = {
  activeTool: ActiveTool;
  snapOn: boolean;
  onToggleSnap: () => void;
  onSetActiveTool: (tool: ActiveTool) => void;
};

export default function Toolbox({ activeTool, snapOn, onToggleSnap, onSetActiveTool }: ToolboxProps) {
  const renderButton = (tool: Tool, label: string) => (
    <button
      key={tool}
      className={`toolbox__btn ${activeTool === tool ? "isActive" : ""}`}
      type="button"
      onClick={() => onSetActiveTool(activeTool === tool ? null : tool)}
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
          {renderButton("platform", "Platform (Landing)")}
          {renderButton("delete", "Delete")}
        </div>
        <label className="snap-toggle">
          <input type="checkbox" checked={snapOn} onChange={onToggleSnap} />
          Snap toggle
        </label>
        <div className="toolbox__hint">Tip: Esc clears tool. Shortcuts: R, P, D, S.</div>
      </div>
    </div>
  );
}
