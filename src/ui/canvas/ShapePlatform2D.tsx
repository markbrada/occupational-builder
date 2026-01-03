import { Group, Rect } from "react-konva";
import { PlatformObj, Tool } from "../../model/types";
import { mmToPx } from "../../model/units";

type Props = {
  obj: PlatformObj;
  selected: boolean;
  hover: boolean;
  activeTool: Tool;
  draggable: boolean;
  ghost?: boolean;
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
  const rectX = -widthPx / 2;
  const rectY = -heightPx / 2;

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
      rotation={obj.rotationDeg}
      listening={!ghost}
    >
      <Rect
        x={rectX}
        y={rectY}
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
