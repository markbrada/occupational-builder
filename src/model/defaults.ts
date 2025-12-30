import { BuilderState, Platform2D, PointMm, Ramp2D } from "./types";

export const defaultBuilderState: BuilderState = {
  mode: "edit",
};

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const makeDefaultRamp = ({ xMm, yMm }: PointMm): Ramp2D => ({
  id: createId("ramp"),
  type: "ramp",
  xMm,
  yMm,
  runMm: 1800,
  widthMm: 1000,
  heightMm: 300,
  elevationMm: 0,
  rotationDeg: 0,
  showArrow: true,
  locked: false,
});

export const makeDefaultPlatform = ({ xMm, yMm }: PointMm): Platform2D => ({
  id: createId("platform"),
  type: "platform",
  xMm,
  yMm,
  lengthMm: 1200,
  widthMm: 1200,
  thicknessMm: 50,
  elevationMm: 0,
  rotationDeg: 0,
  locked: false,
});
