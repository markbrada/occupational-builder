import { Group, Line, Arrow } from "react-konva";
import { getRampOutlinePointsMm, getRampSeamLinesMm } from "../../model/geometry";
import { MeasurementKey, RampObj, SnapIncrementMm, Tool } from "../../model/types";
import { mmToPx } from "../../model/units";
import DimensionAnnotation from "./DimensionAnnotation";

type Props = {
  obj: RampObj;
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

export default function ShapeRamp2D({
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
  const strokeWidth = selected ? 3 : 2;

  const outlinePointsMm = getRampOutlinePointsMm(obj);
  const outlinePointsPx = outlinePointsMm.flatMap((point) => [mmToPx(point.xMm), mmToPx(point.yMm)]);

  const seamLinesPx = getRampSeamLinesMm(obj).map((line) => [
    mmToPx(line.start.xMm),
    mmToPx(line.start.yMm),
    mmToPx(line.end.xMm),
    mmToPx(line.end.yMm),
  ]);

  const lengthPx = mmToPx(obj.runMm);
  const arrowStartX = -lengthPx / 2 + lengthPx * 0.1;
  const arrowEndX = lengthPx / 2 - lengthPx * 0.1;
  const halfLengthMm = obj.runMm / 2;
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
      <Line
        points={outlinePointsPx}
        closed
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        lineJoin="miter"
      />
      {seamLinesPx.map((points, idx) => (
        <Line key={`seam-${idx}`} points={points} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} lineCap="butt" />
      ))}
      {obj.showArrow && (
        <Arrow
          points={[arrowStartX, 0, arrowEndX, 0]}
          pointerLength={14}
          pointerWidth={14}
          stroke={stroke}
          fill={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      )}
      {obj.measurements.L1 && (
        <DimensionAnnotation
          startMm={{ xMm: -halfLengthMm, yMm: -halfWidthMm }}
          endMm={{ xMm: halfLengthMm, yMm: -halfWidthMm }}
          normalMm={{ xMm: 0, yMm: -1 }}
          offsetMm={obj.measurementOffsets.L1}
          label={label(obj.runMm)}
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
          label={label(obj.runMm)}
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
      {obj.hasLeftWing && obj.measurements.WL && obj.leftWingSizeMm > 0 && (
        <DimensionAnnotation
          startMm={{ xMm: halfLengthMm, yMm: -halfWidthMm }}
          endMm={{ xMm: halfLengthMm, yMm: -halfWidthMm - obj.leftWingSizeMm }}
          normalMm={{ xMm: 1, yMm: 0 }}
          offsetMm={obj.measurementOffsets.WL}
          label={label(obj.leftWingSizeMm)}
          rotationDeg={obj.rotationDeg}
          snapIncrementMm={snapIncrementMm}
          onOffsetChange={canDragOffsets ? (offsetMm) => onMeasurementOffsetChange?.("WL", offsetMm) : undefined}
        />
      )}
      {obj.hasRightWing && obj.measurements.WR && obj.rightWingSizeMm > 0 && (
        <DimensionAnnotation
          startMm={{ xMm: halfLengthMm, yMm: halfWidthMm }}
          endMm={{ xMm: halfLengthMm, yMm: halfWidthMm + obj.rightWingSizeMm }}
          normalMm={{ xMm: 1, yMm: 0 }}
          offsetMm={obj.measurementOffsets.WR}
          label={label(obj.rightWingSizeMm)}
          rotationDeg={obj.rotationDeg}
          snapIncrementMm={snapIncrementMm}
          onOffsetChange={canDragOffsets ? (offsetMm) => onMeasurementOffsetChange?.("WR", offsetMm) : undefined}
        />
      )}
    </Group>
  );
}
