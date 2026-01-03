import { BaseObj, LandingObj, MeasurementState, Object2D, RampObj, Snapshot } from "./types";

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
  const nextEnabled = patch.enabled ? { ...current.enabled, ...patch.enabled } : current.enabled;
  const nextSides = patch.sides ? { ...(current.sides ?? {}), ...patch.sides } : current.sides;
  return nextSides && (nextSides.L || nextSides.W)
    ? { enabled: nextEnabled, sides: nextSides }
    : { enabled: nextEnabled };
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
    leftWingSizeMm: base.leftWingSizeMm === undefined ? undefined : clampInt(base.leftWingSizeMm, 0),
    rightWingSizeMm: base.rightWingSizeMm === undefined ? undefined : clampInt(base.rightWingSizeMm, 0),
  };
};

const normaliseLandingObject = (obj: LandingObj): LandingObj => normaliseBaseObject(obj) as LandingObj;

const measurementsEqual = (a: MeasurementState, b: MeasurementState): boolean => {
  const enabledEqual =
    a.enabled.L === b.enabled.L && a.enabled.W === b.enabled.W && a.enabled.H === b.enabled.H && a.enabled.E === b.enabled.E;
  const sidesEqual = (a.sides?.L ?? null) === (b.sides?.L ?? null) && (a.sides?.W ?? null) === (b.sides?.W ?? null);
  return enabledEqual && sidesEqual;
};

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
    measurementsEqual(a.measurements, b.measurements);

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
  const { kind: _ignoredKind, measurements, ...rest } = patch as Partial<RampObj>;
  const mergedMeasurements = mergeMeasurements(obj.measurements, measurements);
  const candidate: RampObj = { ...obj, ...rest, measurements: mergedMeasurements, kind: "ramp" };
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
    ...rest
  } = patch as Partial<RampObj>;
  const mergedMeasurements = mergeMeasurements(obj.measurements, measurements);
  const candidate: LandingObj = { ...obj, ...rest, measurements: mergedMeasurements, kind: "landing" };
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
