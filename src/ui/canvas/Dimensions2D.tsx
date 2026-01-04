import { useMemo } from "react";
import { Group, Line, Rect, Text } from "react-konva";
import type { DimensionSegment } from "../../model/geometry/dimensions";
import { MeasurementKey, Object2D } from "../../model/types";
import { mmToPx } from "../../model/units";

type Dimensions2DProps = {
  objects: Object2D[];
  dimensions: DimensionSegment[];
  cameraScale: number;
  selectedId: string | null;
  selectedMeasurementKey: MeasurementKey | null;
  onSelect: (id: string) => void;
  onSelectMeasurement: (id: string, key: MeasurementKey) => void;
};

const LABEL_PADDING = 6;
const LABEL_FONT_SIZE = 14;

const measureTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

type DimensionLineProps = DimensionSegment & {
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
  tickLengthMm,
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
  const tickHalf = mmToPx(tickLengthMm) / 2;
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

export default function Dimensions2D({
  objects,
  dimensions,
  cameraScale,
  selectedId,
  selectedMeasurementKey,
  onSelect,
  onSelectMeasurement,
}: Dimensions2DProps) {
  const dimensionsByObject = useMemo(() => {
    return dimensions.reduce<Record<string, DimensionSegment[]>>((acc, segment) => {
      acc[segment.objectId] = acc[segment.objectId] ? [...acc[segment.objectId], segment] : [segment];
      return acc;
    }, {});
  }, [dimensions]);

  return (
    <Group>
      {objects.map((obj) => {
        const lines = dimensionsByObject[obj.id] ?? [];
        if (lines.length === 0) return null;
        const color = obj.id === selectedId ? "#2563eb" : obj.locked ? "#94a3b8" : "#0f172a";
        return (
          <Group key={`dim-${obj.id}`}>
            {lines.map((line, idx) => (
              <DimensionLine
                key={`${obj.id}-${line.measurementKey}-${idx}`}
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
