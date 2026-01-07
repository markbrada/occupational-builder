import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Group, Line, Rect, Text } from "react-konva";
import { SnapIncrementMm } from "../../model/types";
import { mmToPx, pxToMm, snapMm } from "../../model/units";

type PointMm = { xMm: number; yMm: number };

type DimensionAnnotationProps = {
  startMm: PointMm;
  endMm: PointMm;
  normalMm: PointMm;
  offsetMm: number;
  label: string;
  rotationDeg: number;
  snapIncrementMm: SnapIncrementMm;
  minOffsetMm?: number;
  onOffsetChange?: (offsetMm: number) => void;
};

const LINE_COLOR = "#2563eb";
const TEXT_COLOR = "#111827";
const FONT_SIZE_MM = 150;
const TICK_SIZE_MM = 80;
const MIN_OFFSET_MM = 100;

const clampMin = (value: number, min: number) => Math.max(min, value);

const normalizeVector = (vector: PointMm): PointMm => {
  const magnitude = Math.hypot(vector.xMm, vector.yMm);
  if (magnitude === 0) return { xMm: 0, yMm: 0 };
  return { xMm: vector.xMm / magnitude, yMm: vector.yMm / magnitude };
};

export default function DimensionAnnotation({
  startMm,
  endMm,
  normalMm,
  offsetMm,
  label,
  rotationDeg,
  snapIncrementMm,
  minOffsetMm = MIN_OFFSET_MM,
  onOffsetChange,
}: DimensionAnnotationProps) {
  const groupRef = useRef<any>(null);
  const textRef = useRef<any>(null);
  const [textSize, setTextSize] = useState({ width: 0, height: 0 });

  const normal = useMemo(() => normalizeVector(normalMm), [normalMm]);
  const tickHalfMm = TICK_SIZE_MM / 2;
  const offsetVectorMm = { xMm: normal.xMm * offsetMm, yMm: normal.yMm * offsetMm };

  const startPx = useMemo(() => ({ x: mmToPx(startMm.xMm), y: mmToPx(startMm.yMm) }), [startMm]);
  const endPx = useMemo(() => ({ x: mmToPx(endMm.xMm), y: mmToPx(endMm.yMm) }), [endMm]);
  const midPx = useMemo(() => ({ x: (startPx.x + endPx.x) / 2, y: (startPx.y + endPx.y) / 2 }), [startPx, endPx]);

  const normalPx = useMemo(() => ({ x: normal.xMm, y: normal.yMm }), [normal]);
  const tickOffsetPx = useMemo(() => ({ x: normalPx.x * mmToPx(tickHalfMm), y: normalPx.y * mmToPx(tickHalfMm) }), [normalPx]);
  const fontSizePx = mmToPx(FONT_SIZE_MM);
  const textRotation = -rotationDeg;

  useLayoutEffect(() => {
    if (!textRef.current) return;
    const rect = textRef.current.getClientRect({ skipTransform: true });
    setTextSize({ width: rect.width, height: rect.height });
  }, [fontSizePx, label]);
  const offsetPx = { x: mmToPx(offsetVectorMm.xMm), y: mmToPx(offsetVectorMm.yMm) };

  const getParentTransform = () => {
    if (!groupRef.current) return null;
    const parent = groupRef.current.getParent?.();
    if (!parent) return null;
    return parent.getAbsoluteTransform?.() ?? null;
  };

  const toLocalPoint = (absolutePos: { x: number; y: number }) => {
    const transform = getParentTransform();
    if (!transform) return absolutePos;
    return transform.copy().invert().point(absolutePos);
  };

  const toAbsolutePoint = (localPos: { x: number; y: number }) => {
    const transform = getParentTransform();
    if (!transform) return localPos;
    return transform.point(localPos);
  };

  const getSnappedOffsetMm = (localPos: { x: number; y: number }) => {
    const projectedPx = localPos.x * normalPx.x + localPos.y * normalPx.y;
    const projectedMm = pxToMm(projectedPx);
    const clamped = clampMin(projectedMm, minOffsetMm);
    return snapMm(clamped, snapIncrementMm);
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    const localPos = toLocalPoint(pos);
    const snappedMm = getSnappedOffsetMm(localPos);
    const localPoint = { x: mmToPx(snappedMm * normalPx.x), y: mmToPx(snappedMm * normalPx.y) };
    return toAbsolutePoint(localPoint);
  };

  const handleDragEnd = (evt: any) => {
    evt.cancelBubble = true;
    if (!onOffsetChange) return;
    const pos = evt.target.getAbsolutePosition();
    const localPos = toLocalPoint(pos);
    onOffsetChange(getSnappedOffsetMm(localPos));
  };

  if (!Number.isFinite(offsetMm)) return null;

  return (
    <Group
      ref={groupRef}
      x={offsetPx.x}
      y={offsetPx.y}
      draggable={Boolean(onOffsetChange)}
      dragBoundFunc={onOffsetChange ? dragBoundFunc : undefined}
      onDragStart={(evt) => {
        evt.cancelBubble = true;
      }}
      onDragMove={(evt) => {
        evt.cancelBubble = true;
      }}
      onDragEnd={handleDragEnd}
    >
      <Line points={[startPx.x, startPx.y, endPx.x, endPx.y]} stroke={LINE_COLOR} strokeWidth={1} lineCap="butt" />
      <Line
        points={[
          startPx.x - tickOffsetPx.x,
          startPx.y - tickOffsetPx.y,
          startPx.x + tickOffsetPx.x,
          startPx.y + tickOffsetPx.y,
        ]}
        stroke={LINE_COLOR}
        strokeWidth={1}
        lineCap="butt"
      />
      <Line
        points={[
          endPx.x - tickOffsetPx.x,
          endPx.y - tickOffsetPx.y,
          endPx.x + tickOffsetPx.x,
          endPx.y + tickOffsetPx.y,
        ]}
        stroke={LINE_COLOR}
        strokeWidth={1}
        lineCap="butt"
      />
      <Group x={midPx.x} y={midPx.y} rotation={textRotation}>
        <Rect x={-textSize.width / 2} y={-textSize.height / 2} width={textSize.width} height={textSize.height} fill="#ffffff" />
        <Text
          ref={textRef}
          x={-textSize.width / 2}
          y={-textSize.height / 2}
          text={label}
          fontSize={fontSizePx}
          fill={TEXT_COLOR}
        />
      </Group>
    </Group>
  );
}
