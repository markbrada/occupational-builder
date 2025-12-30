type ToolboxProps = {
  snapOn: boolean;
  onToggleSnap: () => void;
};

export default function Toolbox({ snapOn, onToggleSnap }: ToolboxProps) {
  return (
    <div className="toolbox">
      <div className="toolbox__header">Toolbox</div>
      <div className="toolbox__item">Ramp</div>
      <div className="toolbox__item">Platform (Landing)</div>
      <div className="toolbox__item">Select/Move</div>
      <div className="toolbox__item">Delete</div>
      <label className="snap-toggle">
        <input type="checkbox" checked={snapOn} onChange={onToggleSnap} />
        Snap toggle
      </label>
    </div>
  );
}
