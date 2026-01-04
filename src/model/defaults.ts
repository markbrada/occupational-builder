import { LandingObj, MEASUREMENT_KEYS, MeasurementAnchors, MeasurementState, RampObj } from "./types";

export const makeId = (): string => `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const DEFAULT_MEASUREMENT_OFFSET_MM = 200;

const defaultMeasurementAnchors = (): MeasurementAnchors =>
  MEASUREMENT_KEYS.reduce<MeasurementAnchors>(
    (acc, key) => ({
      ...acc,
      [key]: { offsetMm: DEFAULT_MEASUREMENT_OFFSET_MM, orientation: "auto" },
    }),
    {} as MeasurementAnchors,
  );

const defaultMeasurements = (): MeasurementState =>
  MEASUREMENT_KEYS.reduce<MeasurementState>(
    (acc, key) => ({
      ...acc,
      [key]: false,
    }),
    {} as MeasurementState,
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
  measurements: defaultMeasurements(),
  measurementAnchors: defaultMeasurementAnchors(),
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
  measurements: defaultMeasurements(),
  measurementAnchors: defaultMeasurementAnchors(),
});
