import { Group, Rect, Arrow } from "react-konva";
import { RampObj, Tool } from "../../model/types";
import { mmToPx } from "../../model/units";

type Props = {
  obj: RampObj;
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

export default function ShapeRamp2D({
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
  const widthPx = mmToPx(obj.runMm);
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
  const arrowStartX = -widthPx / 2 + widthPx * 0.1;
  const arrowEndX = widthPx / 2 - widthPx * 0.1;

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
      {obj.showArrow && (
        <Arrow
          points={[arrowStartX, 0, arrowEndX, 0]}
          pointerLength={14}
          pointerWidth={14}
          stroke={stroke}
          fill={stroke}
          strokeWidth={selected ? 3 : 2}
          opacity={opacity}
        />
      )}
    </Group>
  );
}
