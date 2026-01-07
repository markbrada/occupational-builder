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

  useLayoutEffect(() => {
    if (!textRef.current) return;
    const rect = textRef.current.getClientRect({ skipTransform: true });
    setTextSize({ width: rect.width, height: rect.height });
  }, [fontSizePx, label]);
  const offsetPx = { x: mmToPx(offsetVectorMm.xMm), y: mmToPx(offsetVectorMm.yMm) };

  const getSnappedOffsetMm = (pos: { x: number; y: number }) => {
    const projectedPx = pos.x * normalPx.x + pos.y * normalPx.y;
    const projectedMm = pxToMm(projectedPx);
    const clamped = clampMin(projectedMm, minOffsetMm);
    return snapMm(clamped, snapIncrementMm);
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    const snappedMm = getSnappedOffsetMm(pos);
    return { x: mmToPx(snappedMm * normalPx.x), y: mmToPx(snappedMm * normalPx.y) };
  };

  const handleDragEnd = (evt: any) => {
    if (!onOffsetChange) return;
    const pos = evt.target.position();
    onOffsetChange(getSnappedOffsetMm(pos));
  };

  if (!Number.isFinite(offsetMm)) return null;

  return (
    <Group
      x={offsetPx.x}
      y={offsetPx.y}
      draggable={Boolean(onOffsetChange)}
      dragBoundFunc={onOffsetChange ? dragBoundFunc : undefined}
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
      <Group x={midPx.x} y={midPx.y} rotation={-rotationDeg}>
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
