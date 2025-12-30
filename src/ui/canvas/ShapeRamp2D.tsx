import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { Arrow, Group, Rect } from "react-konva";
import { Ramp2D, SNAP_MM, Tool } from "../../model/types";

type ShapeRamp2DProps = {
  ramp: Ramp2D;
  positionPx: { x: number; y: number };
  pxPerMm: number;
  activeTool: Tool;
  snapOn: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMove: (position: { xMm: number; yMm: number }) => void;
};

const snapCoord = (valuePx: number, snapStepPx: number, snapOn: boolean) =>
  snapOn ? Math.round(valuePx / snapStepPx) * snapStepPx : valuePx;

export default function ShapeRamp2D({
  ramp,
  positionPx,
  pxPerMm,
  activeTool,
  snapOn,
  isSelected,
  onSelect,
  onDelete,
  onMove,
}: ShapeRamp2DProps) {
  const runPx = ramp.runMm * pxPerMm;
  const widthPx = ramp.widthMm * pxPerMm;

  const snapStepPx = SNAP_MM * pxPerMm;
  const pxToMm = (valuePx: number) => valuePx / pxPerMm;
  const snapMm = (valueMm: number) => Math.round(valueMm / SNAP_MM) * SNAP_MM;

  const handleClick = () => {
    if (activeTool === "delete") {
      onDelete();
      return;
    }

    if (activeTool === "select") {
      onSelect();
    }
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const { x, y } = event.target.position();
    const xMm = pxToMm(x);
    const yMm = pxToMm(y);
    const nextX = snapOn ? snapMm(xMm) : xMm;
    const nextY = snapOn ? snapMm(yMm) : yMm;
    onMove({ xMm: nextX, yMm: nextY });
  };

  const dragBoundFunc = (pos: Vector2d) => ({
    x: snapCoord(pos.x, snapStepPx, snapOn),
    y: snapCoord(pos.y, snapStepPx, snapOn),
  });

  const showArrow = ramp.showArrow !== false;
  const arrowInset = Math.min(runPx * 0.1, 12);
  const arrowStartX = -runPx / 2 + arrowInset;
  const arrowEndX = runPx / 2 - arrowInset;
  const arrowY = 0;

  return (
    <Group
      x={positionPx.x}
      y={positionPx.y}
      offsetX={0}
      offsetY={0}
      onClick={handleClick}
      onTap={handleClick}
      draggable={activeTool === "select" && !ramp.locked}
      dragBoundFunc={dragBoundFunc}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-runPx / 2}
        y={-widthPx / 2}
        width={runPx}
        height={widthPx}
        fill="#e2e8f0"
        stroke={isSelected ? "#2563eb" : "#1f2937"}
        strokeWidth={isSelected ? 2.5 : 1.5}
        listening={false}
      />
      {showArrow ? (
        <Arrow
          points={[arrowStartX, arrowY, arrowEndX, arrowY]}
          pointerLength={10}
          pointerWidth={10}
          stroke="#111827"
          fill="#111827"
          strokeWidth={1.5}
          listening={false}
        />
      ) : null}
    </Group>
  );
}
