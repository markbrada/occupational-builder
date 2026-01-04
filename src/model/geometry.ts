import { DEFAULT_LANDING_LENGTH_MM, DEFAULT_LANDING_WIDTH_MM, DEFAULT_RAMP_RUN_MM, DEFAULT_RAMP_WIDTH_MM } from "./defaults";
import { Object2D, RampObj, Tool } from "./types";

export type PointMm = { xMm: number; yMm: number };
export type LineSegmentMm = { start: PointMm; end: PointMm };
export type SizeMm = { widthMm: number; heightMm: number };
export type BoundingBoxMm = SizeMm & { offsetXMm?: number; offsetYMm?: number };

export type FootprintBoundsMm = { minXMm: number; maxXMm: number; minYMm: number; maxYMm: number };

const isVerticalRotation = (rotationDeg: number) => Math.abs(rotationDeg % 180) === 90;

const getRampCornerPoints = (obj: RampObj, includeWings = true) => {
  const length = obj.runMm;
  const halfLength = length / 2;
  const halfWidth = obj.widthMm / 2;
  const lw = includeWings && obj.hasLeftWing ? obj.leftWingSizeMm : 0;
  const rw = includeWings && obj.hasRightWing ? obj.rightWingSizeMm : 0;

  const A: PointMm = { xMm: -halfLength, yMm: -halfWidth };
  const B: PointMm = { xMm: -halfLength, yMm: halfWidth };
  const C: PointMm = { xMm: halfLength, yMm: halfWidth };
  const D: PointMm = { xMm: halfLength, yMm: -halfWidth };
  const outerDownRight: PointMm | null = rw > 0 ? { xMm: halfLength, yMm: halfWidth + rw } : null;
  const outerDownLeft: PointMm | null = lw > 0 ? { xMm: halfLength, yMm: -halfWidth - lw } : null;

  return { A, B, C, D, outerDownRight, outerDownLeft, lw, rw };
};

export const getRampOutlinePointsMm = (obj: RampObj, options?: { includeWings?: boolean }): PointMm[] => {
  const { includeWings = true } = options ?? {};
  const { A, B, C, D, outerDownLeft, outerDownRight } = getRampCornerPoints(obj, includeWings);

  return [A, B, ...(outerDownRight ? [outerDownRight, C] : [C]), D, ...(outerDownLeft ? [outerDownLeft] : [])];
};

export const getRampSeamLinesMm = (obj: RampObj): LineSegmentMm[] => {
  const { A, B, C, D, lw, rw } = getRampCornerPoints(obj);
  const seams: LineSegmentMm[] = [];

  if (lw > 0) {
    seams.push({ start: A, end: D });
  }
  if (rw > 0) {
    seams.push({ start: B, end: C });
  }

  return seams;
};

export const rotatePointMm = (point: PointMm, rotationDeg: number): PointMm => {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { xMm: point.xMm * cos - point.yMm * sin, yMm: point.xMm * sin + point.yMm * cos };
};

export const boundingBoxFromPoints = (points: PointMm[]): BoundingBoxMm => {
  const xs = points.map((p) => p.xMm);
  const ys = points.map((p) => p.yMm);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    widthMm: maxX - minX,
    heightMm: maxY - minY,
    offsetXMm: (minX + maxX) / 2,
    offsetYMm: (minY + maxY) / 2,
  };
};

export const getRampBoundingBoxMm = (obj: RampObj, options?: { includeWings?: boolean }): BoundingBoxMm => {
  const outline = getRampOutlinePointsMm(obj, options);
  const rotated = outline.map((point) => rotatePointMm(point, obj.rotationDeg));
  return boundingBoxFromPoints(rotated);
};

export const getObjectBoundingBoxMm = (obj: Object2D): BoundingBoxMm => {
  if (obj.kind === "ramp") return getRampBoundingBoxMm(obj);

  const vertical = isVerticalRotation(obj.rotationDeg);
  const length = obj.lengthMm;
  const width = obj.widthMm;
  const offsetXMm = 0;
  const offsetYMm = 0;

  if (vertical) {
    return { widthMm: width, heightMm: length, offsetXMm: offsetYMm, offsetYMm: offsetXMm };
  }

  return { widthMm: length, heightMm: width, offsetXMm, offsetYMm };
};

export const getDefaultBoundingBoxMm = (tool: Tool): SizeMm | null => {
  if (tool === "ramp") {
    return { widthMm: DEFAULT_RAMP_RUN_MM, heightMm: DEFAULT_RAMP_WIDTH_MM };
  }
  if (tool === "landing") {
    return { widthMm: DEFAULT_LANDING_LENGTH_MM, heightMm: DEFAULT_LANDING_WIDTH_MM };
  }
  return null;
};

export const topLeftFromCenterMm = (center: PointMm, size: BoundingBoxMm): PointMm => ({
  xMm: center.xMm + (size.offsetXMm ?? 0) - size.widthMm / 2,
  yMm: center.yMm + (size.offsetYMm ?? 0) - size.heightMm / 2,
});

export const centerFromTopLeftMm = (topLeft: PointMm, size: BoundingBoxMm): PointMm => ({
  xMm: topLeft.xMm - (size.offsetXMm ?? 0) + size.widthMm / 2,
  yMm: topLeft.yMm - (size.offsetYMm ?? 0) + size.heightMm / 2,
});

export const getObjectLocalFootprint = (obj: Object2D): FootprintBoundsMm => {
  if (obj.kind === "ramp") {
    const halfRun = obj.runMm / 2;
    const halfWidth = obj.widthMm / 2;
    const leftWing = obj.hasLeftWing ? obj.leftWingSizeMm : 0;
    const rightWing = obj.hasRightWing ? obj.rightWingSizeMm : 0;
    return {
      minXMm: -halfRun,
      maxXMm: halfRun,
      minYMm: -halfWidth - leftWing,
      maxYMm: halfWidth + rightWing,
    };
  }

  const halfLength = obj.lengthMm / 2;
  const halfWidth = obj.widthMm / 2;
  return {
    minXMm: -halfLength,
    maxXMm: halfLength,
    minYMm: -halfWidth,
    maxYMm: halfWidth,
  };
};

export const clampPointToFootprint = (point: PointMm, bounds: FootprintBoundsMm): PointMm => ({
  xMm: Math.min(bounds.maxXMm, Math.max(bounds.minXMm, point.xMm)),
  yMm: Math.min(bounds.maxYMm, Math.max(bounds.minYMm, point.yMm)),
});
