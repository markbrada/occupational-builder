import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { Group, Rect } from "react-konva";
import { Platform2D, SNAP_MM, Tool } from "../../model/types";

type ShapePlatform2DProps = {
  platform: Platform2D;
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

export default function ShapePlatform2D({
  platform,
  positionPx,
  pxPerMm,
  activeTool,
  snapOn,
  isSelected,
  onSelect,
  onDelete,
  onMove,
}: ShapePlatform2DProps) {
  const lengthPx = platform.lengthMm * pxPerMm;
  const widthPx = platform.widthMm * pxPerMm;

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

  return (
    <Group
      x={positionPx.x}
      y={positionPx.y}
      onClick={handleClick}
      onTap={handleClick}
      draggable={activeTool === "select" && !platform.locked}
      dragBoundFunc={dragBoundFunc}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-lengthPx / 2}
        y={-widthPx / 2}
        width={lengthPx}
        height={widthPx}
        fill="#f8fafc"
        stroke={isSelected ? "#2563eb" : "#1f2937"}
        strokeWidth={isSelected ? 2.5 : 1.5}
        listening={false}
      />
    </Group>
  );
}
