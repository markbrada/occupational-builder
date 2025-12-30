import { PlatformObj, RampObj } from "./types";

export const makeId = (): string => `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const newRampAt = (xMm: number, yMm: number): RampObj => ({
  id: makeId(),
  kind: "ramp",
  xMm,
  yMm,
  rotationDeg: 0,
  elevationMm: 0,
  locked: false,
  runMm: 1800,
  widthMm: 1000,
  heightMm: 300,
  showArrow: true,
});

export const newPlatformAt = (xMm: number, yMm: number): PlatformObj => ({
  id: makeId(),
  kind: "platform",
  xMm,
  yMm,
  rotationDeg: 0,
  elevationMm: 0,
  locked: false,
  lengthMm: 1200,
  widthMm: 1200,
  thicknessMm: 50,
});
