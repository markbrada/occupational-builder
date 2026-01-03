import { forwardRef } from "react";
import { Group, Rect, Arrow } from "react-konva";
import type { Group as KonvaGroup } from "konva/lib/Group";
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
  onTransformEnd?: (evt: any) => void;
};

const ShapeRamp2D = forwardRef<KonvaGroup, Props>(function ShapeRamp2D(
  {
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
    onTransformEnd,
  }: Props,
  ref,
) {
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
  const arrowStartX = widthPx * 0.1;
  const arrowEndX = widthPx * 0.9;
  const arrowY = heightPx / 2;

  return (
    <Group
      ref={ref}
      x={mmToPx(obj.xMm)}
      y={mmToPx(obj.yMm)}
      width={widthPx}
      height={heightPx}
      offsetX={widthPx / 2}
      offsetY={heightPx / 2}
      draggable={draggable && !ghost}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      rotation={obj.rotationDeg}
      listening={!ghost}
    >
      <Rect
        x={0}
        y={0}
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
          points={[arrowStartX, arrowY, arrowEndX, arrowY]}
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
});

export default ShapeRamp2D;
