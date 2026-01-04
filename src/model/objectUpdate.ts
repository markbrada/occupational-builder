import {
  BaseObj,
  LandingObj,
  MEASUREMENT_KEYS,
  MeasurementAnchors,
  MeasurementAnchorsPatch,
  MeasurementKey,
  MeasurementLabelPatch,
  MeasurementLabelPositions,
  MeasurementState,
  Object2D,
  RampObj,
  Snapshot,
} from "./types";

export type ObjectPatch = Partial<Object2D> | Partial<BaseObj>;

export const roundMm = (mm: number): number => Math.round(mm);

export const clampInt = (value: number, min: number, max?: number): number => {
  const rounded = Math.round(value);
  const clamped = Math.max(min, max !== undefined ? Math.min(max, rounded) : rounded);
  return Number.isFinite(clamped) ? clamped : min;
};

export const normaliseDeg = (deg: number): number => {
  const rounded = Math.round(deg);
  return ((rounded % 360) + 360) % 360;
};

const mergeMeasurements = (current: MeasurementState, patch?: Partial<MeasurementState>): MeasurementState => {
  if (!patch) return current;
  return MEASUREMENT_KEYS.reduce<MeasurementState>(
    (acc, key) => ({ ...acc, [key]: patch[key] ?? current[key] }),
    { ...current },
  );
};

const mergeMeasurementAnchors = (current: MeasurementAnchors, patch?: MeasurementAnchorsPatch): MeasurementAnchors => {
  if (!patch) return current;
  return MEASUREMENT_KEYS.reduce<MeasurementAnchors>(
    (acc, key) => ({
      ...acc,
      [key]: patch[key]
        ? {
            offsetMm: patch[key]?.offsetMm ?? current[key].offsetMm,
            orientation: patch[key]?.orientation ?? current[key].orientation,
          }
        : acc[key],
    }),
    { ...current },
  );
};

const mergeMeasurementLabels = (current: MeasurementLabelPositions, patch?: MeasurementLabelPatch): MeasurementLabelPositions => {
  if (!patch) return current;
  return MEASUREMENT_KEYS.reduce<MeasurementLabelPositions>(
    (acc, key) => ({
      ...acc,
      [key]:
        key === "H" || key === "E"
          ? {
              xMm: patch[key]?.xMm ?? current[key]?.xMm ?? 0,
              yMm: patch[key]?.yMm ?? current[key]?.yMm ?? 0,
            }
          : acc[key],
    }),
    { ...current },
  );
};

const normaliseBaseObject = (obj: Object2D): Object2D => ({
  ...obj,
  lengthMm: clampInt(obj.lengthMm, 0),
  widthMm: clampInt(obj.widthMm, 0),
  heightMm: clampInt(obj.heightMm, 0),
  elevationMm: clampInt(obj.elevationMm, 0),
  rotationDeg: normaliseDeg(obj.rotationDeg),
  xMm: roundMm(obj.xMm),
  yMm: roundMm(obj.yMm),
});

const normaliseRampObject = (obj: RampObj): RampObj => {
  const base = normaliseBaseObject(obj) as RampObj;
  return {
    ...base,
    runMm: clampInt(base.runMm, 0),
    hasLeftWing: Boolean(base.hasLeftWing),
    hasRightWing: Boolean(base.hasRightWing),
    leftWingSizeMm: clampInt(base.hasLeftWing ? base.leftWingSizeMm : 0, 0),
    rightWingSizeMm: clampInt(base.hasRightWing ? base.rightWingSizeMm : 0, 0),
  };
};

const normaliseLandingObject = (obj: LandingObj): LandingObj => normaliseBaseObject(obj) as LandingObj;

const measurementsEqual = (a: MeasurementState, b: MeasurementState): boolean =>
  MEASUREMENT_KEYS.every((key) => a[key] === b[key]);

const anchorsEqual = (a: MeasurementAnchors, b: MeasurementAnchors): boolean =>
  MEASUREMENT_KEYS.every((key) => a[key].offsetMm === b[key].offsetMm && a[key].orientation === b[key].orientation);

const labelsEqual = (a: MeasurementLabelPositions, b: MeasurementLabelPositions): boolean =>
  MEASUREMENT_KEYS.every((key) => (a[key]?.xMm ?? 0) === (b[key]?.xMm ?? 0) && (a[key]?.yMm ?? 0) === (b[key]?.yMm ?? 0));

const objectsEqual = (a: Object2D, b: Object2D): boolean => {
  const baseEqual =
    a.id === b.id &&
    a.kind === b.kind &&
    a.xMm === b.xMm &&
    a.yMm === b.yMm &&
    a.lengthMm === b.lengthMm &&
    a.widthMm === b.widthMm &&
    a.heightMm === b.heightMm &&
    a.elevationMm === b.elevationMm &&
    a.rotationDeg === b.rotationDeg &&
    a.locked === b.locked &&
    measurementsEqual(a.measurements, b.measurements) &&
    anchorsEqual(a.measurementAnchors, b.measurementAnchors) &&
    labelsEqual(a.measurementLabels, b.measurementLabels);

  if (!baseEqual) return false;

  if (a.kind === "ramp" && b.kind === "ramp") {
    return (
      a.runMm === b.runMm &&
      a.showArrow === b.showArrow &&
      a.hasLeftWing === b.hasLeftWing &&
      a.leftWingSizeMm === b.leftWingSizeMm &&
      a.hasRightWing === b.hasRightWing &&
      a.rightWingSizeMm === b.rightWingSizeMm
    );
  }

  return a.kind === "landing" && b.kind === "landing";
};

const applyPatchToRamp = (obj: RampObj, patch: ObjectPatch): RampObj => {
  const { kind: _ignoredKind, measurements, measurementAnchors, measurementLabels, ...rest } = patch as Partial<RampObj>;
  const mergedMeasurements = mergeMeasurements(obj.measurements, measurements);
  const mergedAnchors = mergeMeasurementAnchors(obj.measurementAnchors, measurementAnchors);
  const mergedLabels = mergeMeasurementLabels(obj.measurementLabels, measurementLabels);
  const candidate: RampObj = {
    ...obj,
    ...rest,
    measurements: mergedMeasurements,
    measurementAnchors: mergedAnchors,
    measurementLabels: mergedLabels,
    kind: "ramp",
  };
  return normaliseRampObject(candidate);
};

const applyPatchToLanding = (obj: LandingObj, patch: ObjectPatch): LandingObj => {
  const {
    kind: _ignoredKind,
    runMm: _ignoreRunMm,
    showArrow: _ignoreShowArrow,
    hasLeftWing: _ignoreLeftWing,
    leftWingSizeMm: _ignoreLeftWingSize,
    hasRightWing: _ignoreRightWing,
    rightWingSizeMm: _ignoreRightWingSize,
    measurements,
    measurementAnchors,
    measurementLabels,
    ...rest
  } = patch as Partial<RampObj>;
  const mergedMeasurements = mergeMeasurements(obj.measurements, measurements);
  const mergedAnchors = mergeMeasurementAnchors(obj.measurementAnchors, measurementAnchors);
  const mergedLabels = mergeMeasurementLabels(obj.measurementLabels, measurementLabels);
  const candidate: LandingObj = {
    ...obj,
    ...rest,
    measurements: mergedMeasurements,
    measurementAnchors: mergedAnchors,
    measurementLabels: mergedLabels,
    kind: "landing",
  };
  return normaliseLandingObject(candidate);
};

export const updateObject = (snapshot: Snapshot, id: string, patch: ObjectPatch): Snapshot => {
  const index = snapshot.objects.findIndex((obj) => obj.id === id);
  if (index === -1) return snapshot;

  const target = snapshot.objects[index];
  const updated = target.kind === "ramp" ? applyPatchToRamp(target, patch) : applyPatchToLanding(target, patch);
  if (objectsEqual(target, updated)) return snapshot;

  const nextObjects = [...snapshot.objects];
  nextObjects[index] = updated;
  return { ...snapshot, objects: nextObjects };
};
