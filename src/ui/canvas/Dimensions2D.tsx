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
const CAD_BLUE = "#2563eb";
const TEXT_COLOR = "#000000";

const measureTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

type DimensionLineProps = DimensionSegment & {
  cameraScale: number;
  onPointerDown: () => void;
};

const DimensionLine = ({
  startMm,
  endMm,
  orientation,
  label,
  tickLengthMm,
  cameraScale,
  onPointerDown,
}: DimensionLineProps) => {
  const strokeWidth = 2;
  const hitStrokeWidth = 10 / cameraScale;
  const fontSize = LABEL_FONT_SIZE;
  const padding = LABEL_PADDING;
  const startPx = { x: mmToPx(startMm.xMm), y: mmToPx(startMm.yMm) };
  const endPx = { x: mmToPx(endMm.xMm), y: mmToPx(endMm.yMm) };
  const tickHalf = mmToPx(tickLengthMm) / 2;
  const center = { x: (startPx.x + endPx.x) / 2, y: (startPx.y + endPx.y) / 2 };
  const labelWidth = measureTextWidth(label, fontSize) + padding * 2;
  const labelHeight = fontSize + padding * 2;

  const labelGroupX = center.x;
  const labelGroupY = center.y;
  const rotation = orientation === "vertical" ? -90 : 0;

  const handlePointerDown = (evt: any) => {
    evt.cancelBubble = true;
    onPointerDown();
  };
  const strokeColor = CAD_BLUE;

  return (
    <Group onPointerDown={handlePointerDown} listening>
      <Line
        points={[startPx.x, startPx.y, endPx.x, endPx.y]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        hitStrokeWidth={hitStrokeWidth}
        lineCap="square"
      />
      {orientation === "horizontal" ? (
        <>
          <Line
            points={[startPx.x, startPx.y - tickHalf, startPx.x, startPx.y + tickHalf]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
            lineCap="square"
          />
          <Line
            points={[endPx.x, endPx.y - tickHalf, endPx.x, endPx.y + tickHalf]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
            lineCap="square"
          />
        </>
      ) : (
        <>
          <Line
            points={[startPx.x - tickHalf, startPx.y, startPx.x + tickHalf, startPx.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
            lineCap="square"
          />
          <Line
            points={[endPx.x - tickHalf, endPx.y, endPx.x + tickHalf, endPx.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            hitStrokeWidth={hitStrokeWidth}
            lineCap="square"
          />
        </>
      )}
      <Group x={labelGroupX} y={labelGroupY} rotation={rotation} listening>
        <Rect x={-labelWidth / 2} y={-labelHeight / 2} width={labelWidth} height={labelHeight} fill="#ffffff" />
        <Text
          x={-labelWidth / 2 + padding}
          y={-labelHeight / 2 + padding}
          width={labelWidth - padding * 2}
          height={labelHeight - padding * 2}
          align="center"
          verticalAlign="middle"
          text={label}
          fontSize={fontSize}
          fill={TEXT_COLOR}
        />
      </Group>
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
        return (
          <Group key={`dim-${obj.id}`}>
            {lines.map((line, idx) => (
              <DimensionLine
                key={`${obj.id}-${line.measurementKey}-${idx}`}
                {...line}
                cameraScale={cameraScale}
                onPointerDown={() => onSelectMeasurement(obj.id, line.measurementKey)}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
}
