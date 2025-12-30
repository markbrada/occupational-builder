import { Tool } from "../../model/types";

type ToolboxProps = {
  activeTool: Tool;
  snapOn: boolean;
  onToggleSnap: () => void;
  onSelectTool: (tool: Tool) => void;
};

const TOOLS: { id: Tool; label: string }[] = [
  { id: "ramp", label: "Ramp" },
  { id: "platform", label: "Platform (Landing)" },
  { id: "select", label: "Select / Move" },
  { id: "delete", label: "Delete" },
];

export default function Toolbox({ activeTool, snapOn, onToggleSnap, onSelectTool }: ToolboxProps) {
  return (
    <div className="toolbox">
      <div className="toolbox__header">Toolbox</div>
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`toolbox__item ${activeTool === tool.id ? "is-active" : ""}`}
          onClick={() => onSelectTool(tool.id)}
        >
          {tool.label}
        </button>
      ))}
      <label className="snap-toggle">
        <input type="checkbox" checked={snapOn} onChange={onToggleSnap} />
        Snap toggle
      </label>
    </div>
  );
}
