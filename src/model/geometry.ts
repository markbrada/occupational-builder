import { DEFAULT_LANDING_LENGTH_MM, DEFAULT_LANDING_WIDTH_MM, DEFAULT_RAMP_RUN_MM, DEFAULT_RAMP_WIDTH_MM } from "./defaults";
import { Object2D, RampObj, Tool } from "./types";

export type PointMm = { xMm: number; yMm: number };
export type SizeMm = { widthMm: number; heightMm: number };
export type BoundingBoxMm = SizeMm & { offsetXMm?: number; offsetYMm?: number };

const isVerticalRotation = (rotationDeg: number) => Math.abs(rotationDeg % 180) === 90;

const getRampProfile = (obj: RampObj) => {
  const leftWing = obj.hasLeftWing ? obj.leftWingSizeMm : 0;
  const rightWing = obj.hasRightWing ? obj.rightWingSizeMm : 0;
  const width = obj.widthMm + leftWing + rightWing;
  const length = obj.runMm;
  const offsetXMm = 0;
  const offsetYMm = (rightWing - leftWing) / 2;
  return { length, width, offsetXMm, offsetYMm };
};

export const getObjectBoundingBoxMm = (obj: Object2D): BoundingBoxMm => {
  const vertical = isVerticalRotation(obj.rotationDeg);

  const { length, width, offsetXMm = 0, offsetYMm = 0 } =
    obj.kind === "ramp" ? getRampProfile(obj) : { length: obj.lengthMm, width: obj.widthMm, offsetXMm: 0, offsetYMm: 0 };

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
