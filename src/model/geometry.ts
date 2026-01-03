import {
  DEFAULT_PLATFORM_LENGTH_MM,
  DEFAULT_PLATFORM_WIDTH_MM,
  DEFAULT_RAMP_RUN_MM,
  DEFAULT_RAMP_WIDTH_MM,
} from "./defaults";
import { Object2D, Tool } from "./types";

export type PointMm = { xMm: number; yMm: number };
export type SizeMm = { widthMm: number; heightMm: number };

const isVerticalRotation = (rotationDeg: number) => Math.abs(rotationDeg % 180) === 90;

export const getObjectBoundingBoxMm = (obj: Object2D): SizeMm => {
  const vertical = isVerticalRotation(obj.rotationDeg);

  if (obj.kind === "ramp") {
    const length = obj.runMm;
    const width = obj.widthMm;
    return vertical ? { widthMm: width, heightMm: length } : { widthMm: length, heightMm: width };
  }

  const length = obj.lengthMm;
  const width = obj.widthMm;
  return vertical ? { widthMm: width, heightMm: length } : { widthMm: length, heightMm: width };
};

export const getDefaultBoundingBoxMm = (tool: Tool): SizeMm | null => {
  if (tool === "ramp") {
    return { widthMm: DEFAULT_RAMP_RUN_MM, heightMm: DEFAULT_RAMP_WIDTH_MM };
  }
  if (tool === "platform") {
    return { widthMm: DEFAULT_PLATFORM_LENGTH_MM, heightMm: DEFAULT_PLATFORM_WIDTH_MM };
  }
  return null;
};

export const topLeftFromCenterMm = (center: PointMm, size: SizeMm): PointMm => ({
  xMm: center.xMm - size.widthMm / 2,
  yMm: center.yMm - size.heightMm / 2,
});

export const centerFromTopLeftMm = (topLeft: PointMm, size: SizeMm): PointMm => ({
  xMm: topLeft.xMm + size.widthMm / 2,
  yMm: topLeft.yMm + size.heightMm / 2,
});
