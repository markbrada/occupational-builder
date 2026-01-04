import { DEFAULT_MEASUREMENT_OFFSET_MM } from "../defaults";
import { MeasurementAnchor, MeasurementKey, Object2D, RampObj } from "../types";
import { getObjectBoundingBoxMm, getRampBoundingBoxMm, topLeftFromCenterMm, type PointMm } from "../geometry";

export type DimensionSegmentVariant = "length" | "width" | "wing" | "height" | "elevation";

export type DimensionSegment = {
  measurementKey: MeasurementKey;
  objectId: string;
  startMm: PointMm;
  endMm: PointMm;
  orientation: "horizontal" | "vertical";
  label: string;
  variant: DimensionSegmentVariant;
  tickLengthMm: number;
  anchorOffsetMm?: number;
  anchorOriginMm?: PointMm;
  anchorDirectionMm?: PointMm;
  anchorScale?: number;
  labelPositionMm?: PointMm;
};

export const DIMENSION_TICK_LENGTH_MM = 80;
export const DIMENSION_BRACKET_HEIGHT_MM = 160;
export const DIMENSION_BRACKET_SPACING_MM = 60;

const defaultAnchor: MeasurementAnchor = { offsetMm: DEFAULT_MEASUREMENT_OFFSET_MM, orientation: "auto" };

const formatMm = (valueMm: number) => `${Math.round(valueMm)}mm`;

const normaliseRotationDeg = (rotationDeg: number) => {
  const wrapped = rotationDeg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const isLengthVertical = (rotationDeg: number) => {
  const normalised = normaliseRotationDeg(rotationDeg);
  return Math.abs(normalised % 180) === 90;
};

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

const buildWingDimensionSegment = (obj: RampObj, side: "left" | "right"): DimensionSegment | null => {
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
  const originWorld = { xMm: obj.xMm + baseRotated.xMm, yMm: obj.yMm + baseRotated.yMm };

  const startMm = { xMm: baseWorld.xMm, yMm: baseWorld.yMm };
  const endMm =
    orientation === "horizontal" ? { xMm: tipWorld.xMm, yMm: baseWorld.yMm } : { xMm: baseWorld.xMm, yMm: tipWorld.yMm };

  return {
    measurementKey,
    objectId: obj.id,
    startMm,
    endMm,
    orientation,
    label: formatMm(wingSize),
    variant: "wing",
    tickLengthMm: DIMENSION_TICK_LENGTH_MM,
    anchorOffsetMm: anchor.offsetMm,
    anchorOriginMm: originWorld,
    anchorDirectionMm: lengthDirection,
  };
};

const getDimensionBoundingBox = (obj: Object2D) =>
  obj.kind === "ramp" ? getRampBoundingBoxMm(obj, { includeWings: false }) : getObjectBoundingBoxMm(obj);

const buildEdgeDimensionSegments = (obj: Object2D): DimensionSegment[] => {
  const bbox = getDimensionBoundingBox(obj);
  const topLeft = topLeftFromCenterMm({ xMm: obj.xMm, yMm: obj.yMm }, bbox);
  const left = topLeft.xMm;
  const right = left + bbox.widthMm;
  const top = topLeft.yMm;
  const bottom = top + bbox.heightMm;

  const verticalLength = isLengthVertical(obj.rotationDeg);
  const segments: DimensionSegment[] = [];

  if (obj.measurements.L1) {
    const anchor = getAnchor(obj, "L1");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "vertical" : "horizontal") : anchor.orientation;
    const offset = anchor.offsetMm;
    const anchorDirectionMm = orientation === "vertical" ? { xMm: -1, yMm: 0 } : { xMm: 0, yMm: -1 };
    const anchorOriginMm = orientation === "vertical" ? { xMm: left, yMm: top } : { xMm: left, yMm: top };
    segments.push(
      orientation === "vertical"
        ? {
            measurementKey: "L1",
            objectId: obj.id,
            startMm: { xMm: left - offset, yMm: top },
            endMm: { xMm: left - offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
            variant: "length",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          }
        : {
            measurementKey: "L1",
            objectId: obj.id,
            startMm: { xMm: left, yMm: top - offset },
            endMm: { xMm: right, yMm: top - offset },
            orientation: "horizontal",
            label: formatMm(right - left),
            variant: "length",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          },
    );
  }

  if (obj.measurements.L2) {
    const anchor = getAnchor(obj, "L2");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "vertical" : "horizontal") : anchor.orientation;
    const offset = anchor.offsetMm;
    const anchorDirectionMm = orientation === "vertical" ? { xMm: 1, yMm: 0 } : { xMm: 0, yMm: 1 };
    const anchorOriginMm = orientation === "vertical" ? { xMm: right, yMm: top } : { xMm: left, yMm: bottom };
    segments.push(
      orientation === "vertical"
        ? {
            measurementKey: "L2",
            objectId: obj.id,
            startMm: { xMm: right + offset, yMm: top },
            endMm: { xMm: right + offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
            variant: "length",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          }
        : {
            measurementKey: "L2",
            objectId: obj.id,
            startMm: { xMm: left, yMm: bottom + offset },
            endMm: { xMm: right, yMm: bottom + offset },
            orientation: "horizontal",
            label: formatMm(right - left),
            variant: "length",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          },
    );
  }

  if (obj.measurements.W1) {
    const anchor = getAnchor(obj, "W1");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "horizontal" : "vertical") : anchor.orientation;
    const offset = anchor.offsetMm;
    const anchorDirectionMm = orientation === "horizontal" ? { xMm: 0, yMm: -1 } : { xMm: -1, yMm: 0 };
    const anchorOriginMm = orientation === "horizontal" ? { xMm: left, yMm: top } : { xMm: left, yMm: top };
    segments.push(
      orientation === "horizontal"
        ? {
            measurementKey: "W1",
            objectId: obj.id,
            startMm: { xMm: left, yMm: top - offset },
            endMm: { xMm: right, yMm: top - offset },
            orientation: "horizontal",
            label: formatMm(right - left),
            variant: "width",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          }
        : {
            measurementKey: "W1",
            objectId: obj.id,
            startMm: { xMm: left - offset, yMm: top },
            endMm: { xMm: left - offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
            variant: "width",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          },
    );
  }

  if (obj.measurements.W2) {
    const anchor = getAnchor(obj, "W2");
    const orientation = anchor.orientation === "auto" ? (verticalLength ? "horizontal" : "vertical") : anchor.orientation;
    const offset = anchor.offsetMm;
    const anchorDirectionMm = orientation === "horizontal" ? { xMm: 0, yMm: 1 } : { xMm: 1, yMm: 0 };
    const anchorOriginMm = orientation === "horizontal" ? { xMm: left, yMm: bottom } : { xMm: right, yMm: top };
    segments.push(
      orientation === "horizontal"
        ? {
            measurementKey: "W2",
            objectId: obj.id,
            startMm: { xMm: left, yMm: bottom + offset },
            endMm: { xMm: right, yMm: bottom + offset },
            orientation: "horizontal",
            label: formatMm(right - left),
            variant: "width",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          }
        : {
            measurementKey: "W2",
            objectId: obj.id,
            startMm: { xMm: right + offset, yMm: top },
            endMm: { xMm: right + offset, yMm: bottom },
            orientation: "vertical",
            label: formatMm(bottom - top),
            variant: "width",
            tickLengthMm: DIMENSION_TICK_LENGTH_MM,
            anchorOffsetMm: offset,
            anchorOriginMm,
            anchorDirectionMm,
          },
    );
  }

  if (obj.kind === "ramp") {
    const leftWingSegment = buildWingDimensionSegment(obj, "left");
    const rightWingSegment = buildWingDimensionSegment(obj, "right");
    if (leftWingSegment) segments.push(leftWingSegment);
    if (rightWingSegment) segments.push(rightWingSegment);
  }

  return segments;
};

const buildBracketSegments = (obj: Object2D): DimensionSegment[] => {
  const bbox = getDimensionBoundingBox(obj);
  const topLeft = topLeftFromCenterMm({ xMm: obj.xMm, yMm: obj.yMm }, bbox);
  const left = topLeft.xMm;
  const top = topLeft.yMm;
  const centerY = top + bbox.heightMm / 2;

  const brackets: DimensionSegment[] = [];
  const shouldShowHeight = obj.measurements.H;
  const shouldShowElevation = obj.measurements.E && obj.elevationMm > 0;

  if (!shouldShowHeight && !shouldShowElevation) {
    return brackets;
  }

  if (shouldShowHeight) {
    const anchor = getAnchor(obj, "H");
    const halfLength = anchor.offsetMm / 2;
    const labelOffset = obj.measurementLabels?.H ?? { xMm: 0, yMm: 0 };
    const labelPositionMm = { xMm: obj.xMm + labelOffset.xMm, yMm: centerY + labelOffset.yMm };
    brackets.push({
      measurementKey: "H",
      objectId: obj.id,
      startMm: { xMm: obj.xMm - halfLength, yMm: centerY },
      endMm: { xMm: obj.xMm + halfLength, yMm: centerY },
      orientation: "horizontal",
      label: `H ${formatMm(obj.heightMm)}`,
      variant: "height",
      tickLengthMm: DIMENSION_TICK_LENGTH_MM,
      anchorOffsetMm: anchor.offsetMm,
      anchorOriginMm: { xMm: obj.xMm, yMm: centerY },
      anchorDirectionMm: { xMm: 1, yMm: 0 },
      anchorScale: 2,
      labelPositionMm,
    });
  }

  if (shouldShowElevation) {
    const anchor = getAnchor(obj, "E");
    const offset = anchor.offsetMm / 2 + DIMENSION_BRACKET_SPACING_MM;
    const labelOffset = obj.measurementLabels?.E ?? { xMm: 0, yMm: 0 };
    const labelPositionMm = { xMm: left - offset + labelOffset.xMm, yMm: top - DIMENSION_BRACKET_HEIGHT_MM + labelOffset.yMm };
    brackets.push({
      measurementKey: "E",
      objectId: obj.id,
      startMm: { xMm: left - offset, yMm: top },
      endMm: { xMm: left - offset, yMm: top - DIMENSION_BRACKET_HEIGHT_MM },
      orientation: "vertical",
      label: `E ${formatMm(obj.elevationMm)}`,
      variant: "elevation",
      tickLengthMm: DIMENSION_TICK_LENGTH_MM,
      anchorOffsetMm: anchor.offsetMm,
      anchorOriginMm: { xMm: left - DIMENSION_BRACKET_SPACING_MM, yMm: top },
      anchorDirectionMm: { xMm: -1, yMm: 0 },
      anchorScale: 2,
      labelPositionMm,
    });
  }

  return brackets;
};

export const generateDimensionsForObject = (obj: Object2D): DimensionSegment[] => [
  ...buildEdgeDimensionSegments(obj),
  ...buildBracketSegments(obj),
];

export const generateDimensions = (objects: Object2D[]): DimensionSegment[] => objects.flatMap(generateDimensionsForObject);
