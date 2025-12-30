import { Group, Rect, Text, Arrow } from "react-konva";
import { ActiveTool, RampObj } from "../../model/types";

type Props = {
  obj: RampObj;
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

export default function ShapeRamp2D({
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
  const widthPx = mmToPx(obj.runMm);
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
          cornerRadius={6}
          opacity={opacity}
        />
        {obj.showArrow && (
          <Arrow
            points={[
              -widthPx / 2 + widthPx * 0.1,
              -heightPx / 2 + heightPx / 2,
              -widthPx / 2 + widthPx * 0.9,
              -heightPx / 2 + heightPx / 2,
            ]}
            pointerLength={14}
            pointerWidth={14}
            stroke={stroke}
            fill={stroke}
            strokeWidth={selected ? 3 : 2}
            opacity={opacity}
          />
        )}
      </Group>
      {!ghost && (
        <Text
          text="Ramp"
          x={rotatedLabel.x}
          y={rotatedLabel.y}
          fill="#0f172a"
          fontSize={12}
          fontStyle="600"
          opacity={0.85}
          listening={false}
        />
      )}
    </Group>
  );
}
