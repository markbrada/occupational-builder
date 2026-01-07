import { LandingObj, MeasurementKey, MeasurementState, RampObj } from "./types";

export const makeId = (): string => `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const measurementKeys: MeasurementKey[] = ["L1", "L2", "W1", "W2", "WL", "WR", "H", "E"];
export const DEFAULT_MEASUREMENT_OFFSET_MM = 200;

const defaultMeasurements = (_elevationMm: number): MeasurementState =>
  measurementKeys.reduce<MeasurementState>(
    (acc, key) => ({
      ...acc,
      [key]: false,
    }),
    {} as MeasurementState,
  );

export const defaultMeasurementOffsets = (): Record<MeasurementKey, number> =>
  measurementKeys.reduce<Record<MeasurementKey, number>>(
    (acc, key) => ({
      ...acc,
      [key]: DEFAULT_MEASUREMENT_OFFSET_MM,
    }),
    {} as Record<MeasurementKey, number>,
  );

export const DEFAULT_RAMP_RUN_MM = 1800;
export const DEFAULT_RAMP_WIDTH_MM = 1000;
export const DEFAULT_RAMP_HEIGHT_MM = 300;

export const newRampAt = (xMm: number, yMm: number): RampObj => ({
  id: makeId(),
  kind: "ramp",
  xMm,
  yMm,
  lengthMm: DEFAULT_RAMP_RUN_MM,
  widthMm: DEFAULT_RAMP_WIDTH_MM,
  heightMm: DEFAULT_RAMP_HEIGHT_MM,
  elevationMm: 0,
  rotationDeg: 0,
  locked: false,
  measurements: defaultMeasurements(0),
  measurementOffsets: defaultMeasurementOffsets(),
  runMm: DEFAULT_RAMP_RUN_MM,
  showArrow: true,
  hasLeftWing: false,
  leftWingSizeMm: 0,
  hasRightWing: false,
  rightWingSizeMm: 0,
});

export const DEFAULT_LANDING_LENGTH_MM = 1200;
export const DEFAULT_LANDING_WIDTH_MM = 1200;
export const DEFAULT_LANDING_HEIGHT_MM = 50;

export const newLandingAt = (xMm: number, yMm: number): LandingObj => ({
  id: makeId(),
  kind: "landing",
  xMm,
  yMm,
  lengthMm: DEFAULT_LANDING_LENGTH_MM,
  widthMm: DEFAULT_LANDING_WIDTH_MM,
  heightMm: DEFAULT_LANDING_HEIGHT_MM,
  elevationMm: 0,
  rotationDeg: 0,
  locked: false,
  measurements: defaultMeasurements(0),
  measurementOffsets: defaultMeasurementOffsets(),
});
