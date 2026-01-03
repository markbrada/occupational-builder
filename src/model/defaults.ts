import { PlatformObj, RampObj } from "./types";

export const makeId = (): string => `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const DEFAULT_RAMP_RUN_MM = 1800;
export const DEFAULT_RAMP_WIDTH_MM = 1000;
export const DEFAULT_RAMP_HEIGHT_MM = 300;

export const newRampAt = (xMm: number, yMm: number): RampObj => ({
  id: makeId(),
  kind: "ramp",
  xMm,
  yMm,
  rotationDeg: 0,
  elevationMm: 0,
  locked: false,
  runMm: DEFAULT_RAMP_RUN_MM,
  widthMm: DEFAULT_RAMP_WIDTH_MM,
  heightMm: DEFAULT_RAMP_HEIGHT_MM,
  showArrow: true,
});

export const DEFAULT_PLATFORM_LENGTH_MM = 1200;
export const DEFAULT_PLATFORM_WIDTH_MM = 1200;
export const DEFAULT_PLATFORM_THICKNESS_MM = 50;

export const newPlatformAt = (xMm: number, yMm: number): PlatformObj => ({
  id: makeId(),
  kind: "platform",
  xMm,
  yMm,
  rotationDeg: 0,
  elevationMm: 0,
  locked: false,
  lengthMm: DEFAULT_PLATFORM_LENGTH_MM,
  widthMm: DEFAULT_PLATFORM_WIDTH_MM,
  thicknessMm: DEFAULT_PLATFORM_THICKNESS_MM,
});
