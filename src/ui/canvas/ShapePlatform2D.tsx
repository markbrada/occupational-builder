import { Group, Rect, Text } from "react-konva";
import { ActiveTool, PlatformObj } from "../../model/types";

type Props = {
  obj: PlatformObj;
  selected: boolean;
  hover: boolean;
  activeTool: ActiveTool;
  draggable: boolean;
  ghost?: boolean;
  mmToPx: (mm: number) => number;
  onPointerDown?: (evt: any) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragEnd?: (evt: any) => void;
};

export default function ShapePlatform2D({
  obj,
  selected,
  hover,
  activeTool,
  draggable,
  ghost = false,
  mmToPx,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  onDragEnd,
}: Props) {
  const widthPx = mmToPx(obj.lengthMm);
  const heightPx = mmToPx(obj.widthMm);
  const rotationRad = (obj.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const labelOffset = {
    x: -widthPx / 2 + 8,
    y: -heightPx / 2 + 6,
  };
  const rotatedLabel = {
    x: labelOffset.x * cos - labelOffset.y * sin,
    y: labelOffset.x * sin + labelOffset.y * cos,
  };
  const fill = ghost ? "rgba(16,185,129,0.25)" : "#e8f5e9";
  const stroke =
    activeTool === "delete" && hover
      ? "#ef4444"
      : selected
        ? "#10b981"
        : hover
          ? "#059669"
          : "#065f46";
  const opacity = ghost ? 0.35 : 1;

  return (
    <Group
      x={mmToPx(obj.xMm)}
      y={mmToPx(obj.yMm)}
      draggable={draggable && !ghost}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragEnd={onDragEnd}
      listening={!ghost}
    >
      <Group offsetX={0} offsetY={0} rotation={obj.rotationDeg}>
        <Rect
          x={-widthPx / 2}
          y={-heightPx / 2}
          width={widthPx}
          height={heightPx}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 3 : 2}
          cornerRadius={8}
          opacity={opacity}
        />
      </Group>
      {!ghost && (
        <Text
          text="Platform"
          x={rotatedLabel.x}
          y={rotatedLabel.y}
          fill="#064e3b"
          fontSize={12}
          fontStyle="600"
          opacity={0.9}
          listening={false}
        />
      )}
    </Group>
  );
}
