import { Group, Line, Rect, Text } from "react-konva";
import { getObjectBoundingBoxMm, topLeftFromCenterMm } from "../../model/geometry";
import { Object2D } from "../../model/types";
import { mmToPx } from "../../model/units";

type DimensionLineSpec = {
  startMm: { xMm: number; yMm: number };
  endMm: { xMm: number; yMm: number };
  orientation: "horizontal" | "vertical";
  label: string;
};

type Dimensions2DProps = {
  objects: Object2D[];
  cameraScale: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const DIM_OFFSET_MM = 200;
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
  onPointerDown: () => void;
};

const DimensionLine = ({ startMm, endMm, orientation, label, cameraScale, color, onPointerDown }: DimensionLineProps) => {
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

  return (
    <Group onPointerDown={handlePointerDown} listening>
      <Line
        points={[startPx.x, startPx.y, endPx.x, endPx.y]}
        stroke={color}
        strokeWidth={strokeWidth}
        hitStrokeWidth={hitStrokeWidth}
        lineCap="butt"
      />
      {orientation === "horizontal" ? (
        <>
          <Line
            points={[startPx.x, startPx.y - tickHalf, startPx.x, startPx.y + tickHalf]}
            stroke={color}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
          <Line
            points={[endPx.x, endPx.y - tickHalf, endPx.x, endPx.y + tickHalf]}
            stroke={color}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
        </>
      ) : (
        <>
          <Line
            points={[startPx.x - tickHalf, startPx.y, startPx.x + tickHalf, startPx.y]}
            stroke={color}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
          <Line
            points={[endPx.x - tickHalf, endPx.y, endPx.x + tickHalf, endPx.y]}
            stroke={color}
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
        fill="#f8fafc"
        stroke={color}
        strokeWidth={strokeWidth}
        cornerRadius={4 / cameraScale}
      />
      <Text x={labelX + padding} y={labelY + padding} text={label} fontSize={fontSize} fill={color} />
    </Group>
  );
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
    lines.push(
      verticalLength
        ? {
            startMm: { xMm: left - DIM_OFFSET_MM, yMm: top },
            endMm: { xMm: left - DIM_OFFSET_MM, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          }
        : {
            startMm: { xMm: left, yMm: top - DIM_OFFSET_MM },
            endMm: { xMm: right, yMm: top - DIM_OFFSET_MM },
            orientation: "horizontal",
            label: formatMm(right - left),
          },
    );
  }

  if (obj.measurements.L2) {
    lines.push(
      verticalLength
        ? {
            startMm: { xMm: right + DIM_OFFSET_MM, yMm: top },
            endMm: { xMm: right + DIM_OFFSET_MM, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          }
        : {
            startMm: { xMm: left, yMm: bottom + DIM_OFFSET_MM },
            endMm: { xMm: right, yMm: bottom + DIM_OFFSET_MM },
            orientation: "horizontal",
            label: formatMm(right - left),
          },
    );
  }

  if (obj.measurements.W1) {
    lines.push(
      verticalLength
        ? {
            startMm: { xMm: left, yMm: top - DIM_OFFSET_MM },
            endMm: { xMm: right, yMm: top - DIM_OFFSET_MM },
            orientation: "horizontal",
            label: formatMm(right - left),
          }
        : {
            startMm: { xMm: left - DIM_OFFSET_MM, yMm: top },
            endMm: { xMm: left - DIM_OFFSET_MM, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          },
    );
  }

  if (obj.measurements.W2) {
    lines.push(
      verticalLength
        ? {
            startMm: { xMm: left, yMm: bottom + DIM_OFFSET_MM },
            endMm: { xMm: right, yMm: bottom + DIM_OFFSET_MM },
            orientation: "horizontal",
            label: formatMm(right - left),
          }
        : {
            startMm: { xMm: right + DIM_OFFSET_MM, yMm: top },
            endMm: { xMm: right + DIM_OFFSET_MM, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
          },
    );
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
    brackets.push({
      startMm: { xMm: left - DIM_OFFSET_MM / 2, yMm: top },
      endMm: { xMm: left - DIM_OFFSET_MM / 2, yMm: top - BRACKET_HEIGHT_MM },
      orientation: "vertical",
      label: `H ${formatMm(obj.heightMm)}`,
    });
  }

  if (shouldShowElevation) {
    const offsetX = left - DIM_OFFSET_MM / 2 - BRACKET_SPACING_MM;
    brackets.push({
      startMm: { xMm: offsetX, yMm: top },
      endMm: { xMm: offsetX, yMm: top - BRACKET_HEIGHT_MM },
      orientation: "vertical",
      label: `E ${formatMm(obj.elevationMm)}`,
    });
  }

  return brackets;
};

export default function Dimensions2D({ objects, cameraScale, selectedId, onSelect }: Dimensions2DProps) {
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
                onPointerDown={() => onSelect(obj.id)}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
}
