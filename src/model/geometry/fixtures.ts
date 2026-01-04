import { DEFAULT_MEASUREMENT_OFFSET_MM } from "../defaults";
import { generateDimensions } from "./dimensions";
import { MEASUREMENT_KEYS, type MeasurementAnchors, type MeasurementKey, type MeasurementState, type RampObj, type Snapshot } from "../types";

const makeDefaultAnchors = (): MeasurementAnchors =>
  MEASUREMENT_KEYS.reduce<MeasurementAnchors>((acc, key) => {
    acc[key] = { offsetMm: DEFAULT_MEASUREMENT_OFFSET_MM, orientation: "auto" };
    return acc;
  }, {} as MeasurementAnchors);

const measurementState: MeasurementState = {
  L1: true,
  L2: true,
  W1: true,
  W2: true,
  WL: false,
  WR: true,
  H: false,
  E: false,
};

export const rampWithRightWingFixture: RampObj = {
  id: "fixture-ramp-with-right-wing",
  kind: "ramp",
  xMm: 0,
  yMm: 0,
  lengthMm: 1000,
  widthMm: 1000,
  heightMm: 0,
  elevationMm: 0,
  rotationDeg: 0,
  locked: false,
  measurements: { ...measurementState },
  measurementAnchors: makeDefaultAnchors(),
  runMm: 1000,
  showArrow: true,
  hasLeftWing: false,
  leftWingSizeMm: 0,
  hasRightWing: true,
  rightWingSizeMm: 500,
};

export const rampWithRightWingPreview: Snapshot = {
  snapOn: true,
  objects: [rampWithRightWingFixture],
  selectedId: rampWithRightWingFixture.id,
  selectedMeasurementKey: null,
};

export const rampWithRightWingPreviewDimensions = generateDimensions(rampWithRightWingPreview.objects);

export const rampWithRightWingPreviewLabels: Record<MeasurementKey, string> = rampWithRightWingPreviewDimensions.reduce(
  (acc, segment) => {
    acc[segment.measurementKey] = segment.label;
    return acc;
  },
  {} as Record<MeasurementKey, string>,
);

export const rampWithRightWingExpectations = {
  runLabel: "1000mm",
  wingLabel: "500mm",
};
