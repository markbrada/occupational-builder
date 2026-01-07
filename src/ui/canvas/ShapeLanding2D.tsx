import { Group, Rect } from "react-konva";
import { LandingObj, MeasurementKey, SnapIncrementMm, Tool } from "../../model/types";
import { mmToPx } from "../../model/units";
import DimensionAnnotation from "./DimensionAnnotation";

type Props = {
  obj: LandingObj;
  selected: boolean;
  hover: boolean;
  activeTool: Tool;
  snapIncrementMm: SnapIncrementMm;
  draggable: boolean;
  dragBoundFunc?: (pos: any) => any;
  ghost?: boolean;
  onMeasurementOffsetChange?: (key: MeasurementKey, offsetMm: number) => void;
  onPointerDown?: (evt: any) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (evt: any) => void;
};

export default function ShapeLanding2D({
  obj,
  selected,
  hover,
  activeTool,
  snapIncrementMm,
  draggable,
  dragBoundFunc,
  ghost = false,
  onMeasurementOffsetChange,
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
  const halfLengthMm = obj.lengthMm / 2;
  const halfWidthMm = obj.widthMm / 2;
  const canDragOffsets = selected && !obj.locked;
  const label = (value: number) => `${value}mm`;

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
      dragBoundFunc={dragBoundFunc}
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
        opacity={opacity}
      />
      {obj.measurements.L1 && (
        <DimensionAnnotation
          startMm={{ xMm: -halfLengthMm, yMm: -halfWidthMm }}
          endMm={{ xMm: halfLengthMm, yMm: -halfWidthMm }}
          normalMm={{ xMm: 0, yMm: -1 }}
          offsetMm={obj.measurementOffsets.L1}
          label={label(obj.lengthMm)}
          rotationDeg={obj.rotationDeg}
          snapIncrementMm={snapIncrementMm}
          onOffsetChange={canDragOffsets ? (offsetMm) => onMeasurementOffsetChange?.("L1", offsetMm) : undefined}
        />
      )}
      {obj.measurements.L2 && (
        <DimensionAnnotation
          startMm={{ xMm: -halfLengthMm, yMm: halfWidthMm }}
          endMm={{ xMm: halfLengthMm, yMm: halfWidthMm }}
          normalMm={{ xMm: 0, yMm: 1 }}
          offsetMm={obj.measurementOffsets.L2}
          label={label(obj.lengthMm)}
          rotationDeg={obj.rotationDeg}
          snapIncrementMm={snapIncrementMm}
          onOffsetChange={canDragOffsets ? (offsetMm) => onMeasurementOffsetChange?.("L2", offsetMm) : undefined}
        />
      )}
      {obj.measurements.W1 && (
        <DimensionAnnotation
          startMm={{ xMm: -halfLengthMm, yMm: -halfWidthMm }}
          endMm={{ xMm: -halfLengthMm, yMm: halfWidthMm }}
          normalMm={{ xMm: -1, yMm: 0 }}
          offsetMm={obj.measurementOffsets.W1}
          label={label(obj.widthMm)}
          rotationDeg={obj.rotationDeg}
          snapIncrementMm={snapIncrementMm}
          onOffsetChange={canDragOffsets ? (offsetMm) => onMeasurementOffsetChange?.("W1", offsetMm) : undefined}
        />
      )}
      {obj.measurements.W2 && (
        <DimensionAnnotation
          startMm={{ xMm: halfLengthMm, yMm: -halfWidthMm }}
          endMm={{ xMm: halfLengthMm, yMm: halfWidthMm }}
          normalMm={{ xMm: 1, yMm: 0 }}
          offsetMm={obj.measurementOffsets.W2}
          label={label(obj.widthMm)}
          rotationDeg={obj.rotationDeg}
          snapIncrementMm={snapIncrementMm}
          onOffsetChange={canDragOffsets ? (offsetMm) => onMeasurementOffsetChange?.("W2", offsetMm) : undefined}
        />
      )}
    </Group>
  );
}
