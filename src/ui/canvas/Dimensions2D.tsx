import { Group, Line, Rect, Text } from "react-konva";
import { getObjectBoundingBoxMm, topLeftFromCenterMm } from "../../model/geometry";
import { DEFAULT_MEASUREMENT_OFFSET_MM } from "../../model/defaults";
import { MeasurementAnchor, MeasurementKey, Object2D, RampObj } from "../../model/types";
import { mmToPx } from "../../model/units";

type DimensionLineSpec = {
  measurementKey: MeasurementKey;
  startMm: { xMm: number; yMm: number };
  endMm: { xMm: number; yMm: number };
  orientation: "horizontal" | "vertical";
  label: string;
};

type Dimensions2DProps = {
  objects: Object2D[];
  cameraScale: number;
  selectedId: string | null;
  selectedMeasurementKey: MeasurementKey | null;
  onSelect: (id: string) => void;
  onSelectMeasurement: (id: string, key: MeasurementKey) => void;
};

const TICK_LENGTH_MM = 80;
const BRACKET_HEIGHT_MM = 160;
const BRACKET_SPACING_MM = 60;
const LABEL_PADDING = 6;
const LABEL_FONT_SIZE = 14;

const measureTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

const normaliseRotationDeg = (rotationDeg: number) => {
  const wrapped = rotationDeg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const isLengthVertical = (rotationDeg: number) => {
  const normalised = normaliseRotationDeg(rotationDeg);
  return Math.abs(normalised % 180) === 90;
};

const formatMm = (valueMm: number) => `${Math.round(valueMm)}mm`;

type DimensionLineProps = DimensionLineSpec & {
  cameraScale: number;
  color: string;
  isSelected: boolean;
  onPointerDown: () => void;
};

const DimensionLine = ({
  startMm,
  endMm,
  orientation,
  label,
  cameraScale,
  color,
  isSelected,
  onPointerDown,
}: DimensionLineProps) => {
  const strokeWidth = 2 / cameraScale;
  const hitStrokeWidth = 10 / cameraScale;
  const fontSize = LABEL_FONT_SIZE / cameraScale;
  const padding = LABEL_PADDING / cameraScale;
  const startPx = { x: mmToPx(startMm.xMm), y: mmToPx(startMm.yMm) };
  const endPx = { x: mmToPx(endMm.xMm), y: mmToPx(endMm.yMm) };
  const tickHalf = mmToPx(TICK_LENGTH_MM) / 2;
  const center = { x: (startPx.x + endPx.x) / 2, y: (startPx.y + endPx.y) / 2 };
  const labelWidth = measureTextWidth(label, fontSize) + padding * 2;
  const labelHeight = fontSize + padding * 2;

  const labelX =
    orientation === "horizontal" ? center.x - labelWidth / 2 : Math.min(startPx.x, endPx.x) - labelWidth - padding;
  const labelY = center.y - labelHeight / 2;

  const handlePointerDown = (evt: any) => {
    evt.cancelBubble = true;
    onPointerDown();
  };

  const fillColor = isSelected ? "#dbeafe" : "#f8fafc";
  const strokeColor = isSelected ? "#2563eb" : color;

  return (
    <Group onPointerDown={handlePointerDown} listening>
      <Line
        points={[startPx.x, startPx.y, endPx.x, endPx.y]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        hitStrokeWidth={hitStrokeWidth}
        lineCap="butt"
      />
      {orientation === "horizontal" ? (
        <>
          <Line
            points={[startPx.x, startPx.y - tickHalf, startPx.x, startPx.y + tickHalf]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
          <Line
            points={[endPx.x, endPx.y - tickHalf, endPx.x, endPx.y + tickHalf]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
        </>
      ) : (
        <>
          <Line
            points={[startPx.x - tickHalf, startPx.y, startPx.x + tickHalf, startPx.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
          <Line
            points={[endPx.x - tickHalf, endPx.y, endPx.x + tickHalf, endPx.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
        </>
      )}
      <Rect
        x={labelX}
        y={labelY}
        width={labelWidth}
        height={labelHeight}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        cornerRadius={4 / cameraScale}
      />
      <Text x={labelX + padding} y={labelY + padding} text={label} fontSize={fontSize} fill={strokeColor} />
    </Group>
  );
};

const defaultAnchor: MeasurementAnchor = { offsetMm: DEFAULT_MEASUREMENT_OFFSET_MM, orientation: "auto" };

const getAnchor = (obj: Object2D, key: MeasurementKey): MeasurementAnchor => obj.measurementAnchors?.[key] ?? defaultAnchor;

const rotatePointMm = (point: { xMm: number; yMm: number }, rotationDeg: number) => {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    xMm: point.xMm * cos - point.yMm * sin,
    yMm: point.xMm * sin + point.yMm * cos,
  };
};

const buildWingDimensionLine = (obj: RampObj, side: "left" | "right"): DimensionLineSpec | null => {
  const hasWing = side === "left" ? obj.hasLeftWing : obj.hasRightWing;
  const wingSize = side === "left" ? obj.leftWingSizeMm : obj.rightWingSizeMm;
  const measurementKey: MeasurementKey = side === "left" ? "WL" : "WR";

  if (!hasWing || wingSize <= 0 || !obj.measurements[measurementKey]) {
    return null;
  }

  const verticalLength = isLengthVertical(obj.rotationDeg);
  const orientation: "horizontal" | "vertical" = verticalLength ? "horizontal" : "vertical";
  const anchor = getAnchor(obj, measurementKey);

  const halfRun = obj.runMm / 2;
  const halfWidth = obj.widthMm / 2;
  const wingDirection = side === "right" ? 1 : -1;

  const localBase = { xMm: halfRun, yMm: wingDirection * halfWidth };
  const localTip = { xMm: halfRun, yMm: wingDirection * (halfWidth + wingSize) };

  const baseRotated = rotatePointMm(localBase, obj.rotationDeg);
  const tipRotated = rotatePointMm(localTip, obj.rotationDeg);

  const lengthDirection = rotatePointMm({ xMm: 1, yMm: 0 }, obj.rotationDeg);
  const offset = {
    xMm: lengthDirection.xMm * anchor.offsetMm,
    yMm: lengthDirection.yMm * anchor.offsetMm,
  };

  const baseWorld = { xMm: obj.xMm + baseRotated.xMm + offset.xMm, yMm: obj.yMm + baseRotated.yMm + offset.yMm };
  const tipWorld = { xMm: obj.xMm + tipRotated.xMm + offset.xMm, yMm: obj.yMm + tipRotated.yMm + offset.yMm };

  const startMm =
    orientation === "horizontal"
      ? { xMm: baseWorld.xMm, yMm: baseWorld.yMm }
      : { xMm: baseWorld.xMm, yMm: baseWorld.yMm };
  const endMm =
    orientation === "horizontal"
      ? { xMm: tipWorld.xMm, yMm: baseWorld.yMm }
      : { xMm: baseWorld.xMm, yMm: tipWorld.yMm };

  return {
    measurementKey,
    startMm,
    endMm,
    orientation,
    label: formatMm(wingSize),
  };
};

const buildDimensionLines = (obj: Object2D): DimensionLineSpec[] => {
  const bbox = getObjectBoundingBoxMm(obj);
  const topLeft = topLeftFromCenterMm({ xMm: obj.xMm, yMm: obj.yMm }, bbox);
  const left = topLeft.xMm;
  const right = left + bbox.widthMm;
  const top = topLeft.yMm;
  const bottom = top + bbox.heightMm;

  const verticalLength = isLengthVertical(obj.rotationDeg);
  const lines: DimensionLineSpec[] = [];

  if (obj.measurements.L1) {
    const anchor = getAnchor(obj, "L1");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "vertical" : "horizontal") : anchor.orientation;
    const offset = anchor.offsetMm;
    lines.push(
      orientation === "vertical"
        ? {
            measurementKey: "L1",
            startMm: { xMm: left - offset, yMm: top },
            endMm: { xMm: left - offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          }
        : {
            measurementKey: "L1",
            startMm: { xMm: left, yMm: top - offset },
            endMm: { xMm: right, yMm: top - offset },
            orientation: "horizontal",
            label: formatMm(right - left),
          },
    );
  }

  if (obj.measurements.L2) {
    const anchor = getAnchor(obj, "L2");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "vertical" : "horizontal") : anchor.orientation;
    const offset = anchor.offsetMm;
    lines.push(
      orientation === "vertical"
        ? {
            measurementKey: "L2",
            startMm: { xMm: right + offset, yMm: top },
            endMm: { xMm: right + offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          }
        : {
            measurementKey: "L2",
            startMm: { xMm: left, yMm: bottom + offset },
            endMm: { xMm: right, yMm: bottom + offset },
            orientation: "horizontal",
            label: formatMm(right - left),
          },
    );
  }

  if (obj.measurements.W1) {
    const anchor = getAnchor(obj, "W1");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "horizontal" : "vertical") : anchor.orientation;
    const offset = anchor.offsetMm;
    lines.push(
      orientation === "horizontal"
        ? {
            measurementKey: "W1",
            startMm: { xMm: left, yMm: top - offset },
            endMm: { xMm: right, yMm: top - offset },
            orientation: "horizontal",
            label: formatMm(right - left),
          }
        : {
            measurementKey: "W1",
            startMm: { xMm: left - offset, yMm: top },
            endMm: { xMm: left - offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          },
    );
  }

  if (obj.measurements.W2) {
    const anchor = getAnchor(obj, "W2");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "horizontal" : "vertical") : anchor.orientation;
    const offset = anchor.offsetMm;
    lines.push(
      orientation === "horizontal"
        ? {
            measurementKey: "W2",
            startMm: { xMm: left, yMm: bottom + offset },
            endMm: { xMm: right, yMm: bottom + offset },
            orientation: "horizontal",
            label: formatMm(right - left),
          }
        : {
            measurementKey: "W2",
            startMm: { xMm: right + offset, yMm: top },
            endMm: { xMm: right + offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          },
    );
  }

  if (obj.kind === "ramp") {
    const leftWingLine = buildWingDimensionLine(obj, "left");
    const rightWingLine = buildWingDimensionLine(obj, "right");
    if (leftWingLine) lines.push(leftWingLine);
    if (rightWingLine) lines.push(rightWingLine);
  }

  return lines;
};

const buildBracketLines = (obj: Object2D): DimensionLineSpec[] => {
  const bbox = getObjectBoundingBoxMm(obj);
  const topLeft = topLeftFromCenterMm({ xMm: obj.xMm, yMm: obj.yMm }, bbox);
  const left = topLeft.xMm;
  const top = topLeft.yMm;

  const brackets: DimensionLineSpec[] = [];
  const shouldShowHeight = obj.measurements.H;
  const shouldShowElevation = obj.measurements.E && obj.elevationMm > 0;

  if (!shouldShowHeight && !shouldShowElevation) {
    return brackets;
  }

  if (shouldShowHeight) {
    const anchor = getAnchor(obj, "H");
    const orientation: "vertical" = "vertical";
    const offset = anchor.offsetMm / 2;
    brackets.push(
      {
        measurementKey: "H",
        startMm: { xMm: left - offset, yMm: top },
        endMm: { xMm: left - offset, yMm: top - BRACKET_HEIGHT_MM },
        orientation,
        label: `H ${formatMm(obj.heightMm)}`,
      },
    );
  }

  if (shouldShowElevation) {
    const anchor = getAnchor(obj, "E");
    const orientation: "vertical" = "vertical";
    const offset = anchor.offsetMm / 2 + BRACKET_SPACING_MM;
    brackets.push(
      {
        measurementKey: "E",
        startMm: { xMm: left - offset, yMm: top },
        endMm: { xMm: left - offset, yMm: top - BRACKET_HEIGHT_MM },
        orientation,
        label: `E ${formatMm(obj.elevationMm)}`,
      },
    );
  }

  return brackets;
};

export default function Dimensions2D({
  objects,
  cameraScale,
  selectedId,
  selectedMeasurementKey,
  onSelect,
  onSelectMeasurement,
}: Dimensions2DProps) {
  return (
    <Group>
      {objects.map((obj) => {
        const lines = [...buildDimensionLines(obj), ...buildBracketLines(obj)];
        if (lines.length === 0) return null;
        const color = obj.id === selectedId ? "#2563eb" : obj.locked ? "#94a3b8" : "#0f172a";
        return (
          <Group key={`dim-${obj.id}`}>
            {lines.map((line, idx) => (
              <DimensionLine
                key={`${obj.id}-${line.label}-${idx}`}
                {...line}
                cameraScale={cameraScale}
                color={color}
                isSelected={selectedMeasurementKey === line.measurementKey && selectedId === obj.id}
                onPointerDown={() => onSelectMeasurement(obj.id, line.measurementKey)}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
}
