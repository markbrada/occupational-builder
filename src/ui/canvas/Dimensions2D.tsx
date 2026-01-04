import { useMemo } from "react";
import { Group, Line, Text } from "react-konva";
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
  onStartAnchorDrag: (objectId: string, measurementKey: MeasurementKey) => void;
  onEndAnchorDrag: () => void;
};

const LABEL_FONT_SIZE = 14;

const DIMENSION_COLOR = "#2563eb";
const SELECTED_DIMENSION_COLOR = "#1d4ed8";
const TEXT_COLOR = "#000000";
const MIN_HIT_WIDTH_PX = 10;

const measureTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

type DimensionLineProps = DimensionSegment & {
  cameraScale: number;
  color: string;
  isSelected: boolean;
  locked: boolean;
  onPointerDown: () => void;
  onLabelPointerDown: () => void;
  onLabelPointerUp: () => void;
};

const DimensionLine = ({
  startMm,
  endMm,
  labelPositionMm,
  leaderFromMm,
  renderLine,
  renderTicks,
  orientation,
  label,
  tickLengthMm,
  cameraScale,
  color,
  isSelected,
  locked,
  onPointerDown,
  onLabelPointerDown,
  onLabelPointerUp,
}: DimensionLineProps) => {
  const strokeWidth = isSelected ? 3 : 2;
  const hitStrokeWidth = Math.max(MIN_HIT_WIDTH_PX / cameraScale, strokeWidth);
  const fontSize = LABEL_FONT_SIZE;
  const startPx = { x: mmToPx(startMm.xMm), y: mmToPx(startMm.yMm) };
  const endPx = { x: mmToPx(endMm.xMm), y: mmToPx(endMm.yMm) };
  const tickHalf = mmToPx(tickLengthMm) / 2;
  const labelPointPx = labelPositionMm
    ? { x: mmToPx(labelPositionMm.xMm), y: mmToPx(labelPositionMm.yMm) }
    : { x: (startPx.x + endPx.x) / 2, y: (startPx.y + endPx.y) / 2 };
  const labelWidth = measureTextWidth(label, fontSize);

  const labelX = labelPointPx.x;
  const labelY = labelPointPx.y;

  const handlePointerDown = (evt: any) => {
    evt.cancelBubble = true;
    onPointerDown();
  };

  const handleLabelPointerDown = (evt: any) => {
    evt.cancelBubble = true;
    if (locked) return;
    onLabelPointerDown();
  };

  const handleLabelPointerUp = (evt: any) => {
    evt.cancelBubble = true;
    onLabelPointerUp();
  };

  const strokeColor = isSelected ? SELECTED_DIMENSION_COLOR : color;
  const shouldRenderLine = renderLine !== false;
  const shouldRenderTicks = renderTicks !== false;
  const leaderFromPx = leaderFromMm ? { x: mmToPx(leaderFromMm.xMm), y: mmToPx(leaderFromMm.yMm) } : null;

  return (
    <Group onPointerDown={handlePointerDown} listening>
      {shouldRenderLine && (
        <Line
          points={[startPx.x, startPx.y, endPx.x, endPx.y]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          lineCap="square"
        />
      )}
      {leaderFromPx && (
        <Line
          points={[leaderFromPx.x, leaderFromPx.y, labelPointPx.x, labelPointPx.y]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          lineCap="round"
        />
      )}
      {shouldRenderTicks &&
        (orientation === "horizontal" ? (
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
        ))}
      <Text
        x={labelX}
        y={labelY}
        offsetX={labelWidth / 2}
        offsetY={fontSize / 2}
        width={labelWidth}
        height={fontSize}
        text={label}
        fontSize={fontSize}
        fill={TEXT_COLOR}
        align="center"
        wrap="none"
        listening
        draggable={false}
        onPointerDown={handleLabelPointerDown}
        onPointerUp={handleLabelPointerUp}
      />
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
  onStartAnchorDrag,
  onEndAnchorDrag,
}: Dimensions2DProps) {
  const dimensionsByObject = useMemo(() => {
    return dimensions.reduce<Record<string, DimensionSegment[]>>((acc, segment) => {
      acc[segment.objectId] = acc[segment.objectId] ? [...acc[segment.objectId], segment] : [segment];
      return acc;
    }, {});
  }, [dimensions]);

  const objectsById = useMemo(() => objects.reduce<Record<string, Object2D>>((acc, obj) => ({ ...acc, [obj.id]: obj }), {}), [objects]);

  return (
    <Group>
      {objects.map((obj) => {
        const lines = dimensionsByObject[obj.id] ?? [];
        if (lines.length === 0) return null;
        const color = DIMENSION_COLOR;
        return (
          <Group key={`dim-${obj.id}`}>
            {lines.map((line, idx) => (
              <DimensionLine
                key={`${obj.id}-${line.measurementKey}-${idx}`}
                {...line}
                cameraScale={cameraScale}
                color={color}
                isSelected={selectedMeasurementKey === line.measurementKey && selectedId === obj.id}
                locked={Boolean(objectsById[obj.id]?.locked)}
                onPointerDown={() => onSelectMeasurement(obj.id, line.measurementKey)}
                onLabelPointerDown={() => {
                  onSelect(obj.id);
                  onSelectMeasurement(obj.id, line.measurementKey);
                  onStartAnchorDrag(obj.id, line.measurementKey);
                }}
                onLabelPointerUp={onEndAnchorDrag}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
}
