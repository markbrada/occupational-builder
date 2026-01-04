import { useMemo } from "react";
import { Group, Line, Rect, Text, Circle } from "react-konva";
import type { DimensionSegment } from "../../model/geometry/dimensions";
import { MeasurementKey, Object2D } from "../../model/types";
import { mmToPx, pxToMm, snapMm } from "../../model/units";
import { getObjectBoundingBoxMm, topLeftFromCenterMm, type PointMm } from "../../model/geometry";
import { DIMENSION_BRACKET_HEIGHT_MM } from "../../model/geometry/dimensions";

type Dimensions2DProps = {
  objects: Object2D[];
  dimensions: DimensionSegment[];
  cameraScale: number;
  selectedId: string | null;
  selectedMeasurementKey: MeasurementKey | null;
  onSelect: (id: string) => void;
  onSelectMeasurement: (id: string, key: MeasurementKey) => void;
  onUpdateAnchor: (id: string, key: MeasurementKey, offsetMm: number, commit?: boolean) => void;
  onUpdateLabel: (id: string, key: MeasurementKey, position: PointMm, commit?: boolean) => void;
};

const LABEL_PADDING = 4;
const LABEL_FONT_SIZE = 12;
const CAD_BLUE = "#2563eb";
const TEXT_COLOR = "#000000";
const ANCHOR_HANDLE_RADIUS = 8;
const ANCHOR_SNAP_MM = 50;
const LABEL_HIT_PADDING = 12;
const FONT_FAMILY =
  '"Roboto Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const measureTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

type DimensionLineProps = DimensionSegment & {
  cameraScale: number;
  onPointerDown: () => void;
  onAnchorDrag?: (offsetMm: number, commit?: boolean) => void;
  onLabelDrag?: (position: PointMm, commit?: boolean) => void;
  clampLabel?: (position: PointMm) => PointMm;
};

const DimensionLine = ({
  startMm,
  endMm,
  orientation,
  label,
  tickLengthMm,
  cameraScale,
  onPointerDown,
  anchorOriginMm,
  anchorDirectionMm,
  anchorOffsetMm,
  anchorScale,
  labelPositionMm,
  onAnchorDrag,
  onLabelDrag,
  clampLabel,
}: DimensionLineProps) => {
  const strokeWidth = 1.35;
  const hitStrokeWidth = 10 / cameraScale;
  const fontSize = LABEL_FONT_SIZE;
  const padding = LABEL_PADDING;
  const startPx = { x: mmToPx(startMm.xMm), y: mmToPx(startMm.yMm) };
  const endPx = { x: mmToPx(endMm.xMm), y: mmToPx(endMm.yMm) };
  const tickHalf = mmToPx(tickLengthMm) / 2;
  const center = { x: (startPx.x + endPx.x) / 2, y: (startPx.y + endPx.y) / 2 };
  const labelWidth = measureTextWidth(label, fontSize) + padding * 2;
  const labelHeight = fontSize + padding * 2;

  const labelGroupX = labelPositionMm ? mmToPx(labelPositionMm.xMm) : center.x;
  const labelGroupY = labelPositionMm ? mmToPx(labelPositionMm.yMm) : center.y;
  const rotation = orientation === "vertical" ? -90 : 0;

  const handlePointerDown = (evt: any) => {
    evt.cancelBubble = true;
    onPointerDown();
  };
  const strokeColor = CAD_BLUE;
  const directionLength = anchorDirectionMm ? Math.hypot(anchorDirectionMm.xMm, anchorDirectionMm.yMm) : 0;
  const anchorMultiplier = anchorScale ?? 1;
  const normalisedDirection = directionLength > 0 ? { xMm: anchorDirectionMm!.xMm / directionLength, yMm: anchorDirectionMm!.yMm / directionLength } : null;
  const handleRadius = ANCHOR_HANDLE_RADIUS / cameraScale;

  const getBoundedAnchorPosition = (pos: { x: number; y: number }) => {
    if (!anchorOriginMm || !normalisedDirection) return { ...pos, snappedOffset: anchorOffsetMm };
    const candidateMm = { xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) };
    const vector = { xMm: candidateMm.xMm - anchorOriginMm.xMm, yMm: candidateMm.yMm - anchorOriginMm.yMm };
    const projection = vector.xMm * normalisedDirection.xMm + vector.yMm * normalisedDirection.yMm;
    const scaledOffset = Math.max(0, projection * anchorMultiplier);
    const snappedOffset = snapMm(scaledOffset, ANCHOR_SNAP_MM);
    const constrainedDistance = snappedOffset / anchorMultiplier;
    const clampedMm = {
      xMm: anchorOriginMm.xMm + normalisedDirection.xMm * constrainedDistance,
      yMm: anchorOriginMm.yMm + normalisedDirection.yMm * constrainedDistance,
    };
    return { x: mmToPx(clampedMm.xMm), y: mmToPx(clampedMm.yMm), snappedOffset };
  };

  const labelDragBound = (pos: { x: number; y: number }) => {
    if (!clampLabel) return pos;
    const candidateMm = { xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) };
    const clamped = clampLabel(candidateMm);
    return { x: mmToPx(clamped.xMm), y: mmToPx(clamped.yMm) };
  };

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
      <Group
        x={labelGroupX}
        y={labelGroupY}
        rotation={rotation}
        listening
        draggable={Boolean(onLabelDrag)}
        dragBoundFunc={labelDragBound}
        onDragMove={(evt: any) => {
          if (!onLabelDrag) return;
          const pos = evt.target.position();
          const asMm = clampLabel ? clampLabel({ xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) }) : { xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) };
          onLabelDrag(asMm, false);
        }}
        onDragEnd={(evt: any) => {
          if (!onLabelDrag) return;
          const pos = evt.target.position();
          const asMm = clampLabel ? clampLabel({ xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) }) : { xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) };
          onLabelDrag(asMm, true);
        }}
      >
        <Rect
          x={-labelWidth / 2 - LABEL_HIT_PADDING}
          y={-labelHeight / 2 - LABEL_HIT_PADDING}
          width={labelWidth + LABEL_HIT_PADDING * 2}
          height={labelHeight + LABEL_HIT_PADDING * 2}
          fill="rgba(0,0,0,0.001)"
          listening={Boolean(onLabelDrag)}
        />
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
          fontFamily={FONT_FAMILY}
        />
      </Group>
      {onAnchorDrag && anchorOriginMm && normalisedDirection && (
        <Circle
          x={center.x}
          y={center.y}
          radius={handleRadius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="#ffffff"
          draggable
          dragBoundFunc={(pos) => {
            const bounded = getBoundedAnchorPosition(pos);
            return { x: bounded.x, y: bounded.y };
          }}
          onDragMove={(evt: any) => {
            const bounded = getBoundedAnchorPosition(evt.target.position());
            if (bounded && onAnchorDrag) {
              onAnchorDrag(bounded.snappedOffset ?? anchorOffsetMm ?? 0, false);
            }
          }}
          onDragEnd={(evt: any) => {
            const bounded = getBoundedAnchorPosition(evt.target.position());
            if (bounded && onAnchorDrag) {
              onAnchorDrag(bounded.snappedOffset ?? anchorOffsetMm ?? 0, true);
            }
          }}
          onPointerDown={(evt: any) => {
            evt.cancelBubble = true;
            onPointerDown();
          }}
        />
      )}
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
  onUpdateAnchor,
  onUpdateLabel,
}: Dimensions2DProps) {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const dimensionsByObject = useMemo(() => {
    return dimensions.reduce<Record<string, DimensionSegment[]>>((acc, segment) => {
      acc[segment.objectId] = acc[segment.objectId] ? [...acc[segment.objectId], segment] : [segment];
      return acc;
    }, {});
  }, [dimensions]);

  const clampers = useMemo(() => {
    return objects.reduce<Record<string, (point: PointMm) => PointMm>>((acc, obj) => {
      const bbox = getObjectBoundingBoxMm(obj);
      const topLeft = topLeftFromCenterMm({ xMm: obj.xMm, yMm: obj.yMm }, bbox);
      const minX = topLeft.xMm;
      const maxX = topLeft.xMm + bbox.widthMm;
      const minY = topLeft.yMm;
      const maxY = topLeft.yMm + bbox.heightMm;
      acc[obj.id] = (point: PointMm) => ({
        xMm: clamp(point.xMm, minX, maxX),
        yMm: clamp(point.yMm, minY, maxY),
      });
      return acc;
    }, {});
  }, [objects]);

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
                onAnchorDrag={
                  line.anchorDirectionMm && line.anchorOriginMm && typeof line.anchorOffsetMm === "number"
                    ? (offsetMm, commit) => onUpdateAnchor(obj.id, line.measurementKey, offsetMm, commit)
                    : undefined
                }
                onLabelDrag={
                  (line.variant === "height" || line.variant === "elevation") && clampers[obj.id]
                    ? (position, commit) => {
                        if (line.variant === "height") {
                          const baselineY = line.startMm.yMm;
                          const offset = { xMm: position.xMm - obj.xMm, yMm: position.yMm - baselineY };
                          onUpdateLabel(obj.id, line.measurementKey, offset, commit);
                          return;
                        }
                        if (line.variant === "elevation") {
                          const baseline = { xMm: line.startMm.xMm, yMm: line.startMm.yMm - DIMENSION_BRACKET_HEIGHT_MM };
                          const offset = { xMm: position.xMm - baseline.xMm, yMm: position.yMm - baseline.yMm };
                          onUpdateLabel(obj.id, line.measurementKey, offset, commit);
                        }
                      }
                    : undefined
                }
                clampLabel={clampers[obj.id]}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
}
