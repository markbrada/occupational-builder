import { Group, Rect } from "react-konva";
import { PlatformObj, Tool } from "../../model/types";

type Props = {
  obj: PlatformObj;
  selected: boolean;
  hover: boolean;
  activeTool: Tool;
  draggable: boolean;
  ghost?: boolean;
  mmToPx: (mm: number) => number;
  onPointerDown?: (evt: any) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
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
  onDragStart,
  onDragEnd,
}: Props) {
  const widthPx = mmToPx(obj.lengthMm);
  const heightPx = mmToPx(obj.widthMm);
  const fill = ghost ? "rgba(59,130,246,0.25)" : "#e5e7eb";
  const stroke =
    activeTool === "delete" && hover
      ? "#ef4444"
      : selected
        ? "#2563eb"
        : hover
          ? "#64748b"
          : "#0f172a";
  const opacity = ghost ? 0.35 : 1;

  return (
    <Group
      x={mmToPx(obj.xMm)}
      y={mmToPx(obj.yMm)}
      draggable={draggable && !ghost}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      offsetX={widthPx / 2}
      offsetY={heightPx / 2}
      rotation={obj.rotationDeg}
      listening={!ghost}
    >
      <Rect
        width={widthPx}
        height={heightPx}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 3 : 2}
        cornerRadius={6}
        opacity={opacity}
      />
    </Group>
  );
}
