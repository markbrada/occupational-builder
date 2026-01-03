import {
  DEFAULT_LANDING_HEIGHT_MM,
  DEFAULT_LANDING_LENGTH_MM,
  DEFAULT_LANDING_WIDTH_MM,
  DEFAULT_RAMP_HEIGHT_MM,
  DEFAULT_RAMP_RUN_MM,
  DEFAULT_RAMP_WIDTH_MM,
} from "./defaults";
import { LandingObj, MeasurementKey, MeasurementState, Object2D, RampObj, Tool } from "./types";

export const STORAGE_KEY = "occupational_builder_v1";

const SCHEMA_VERSION = 1;

export type PersistedProject = {
  mode: "2d" | "3d";
  activeTool: Tool;
  snapOn: boolean;
  objects: Object2D[];
  selectedId: string | null;
};

type PersistedEnvelope = {
  schemaVersion: number;
  savedAt: number;
  data: unknown;
};

const hasLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isString = (value: unknown): value is string => typeof value === "string";
const isMode = (value: unknown): value is "2d" | "3d" => value === "2d" || value === "3d";
const isTool = (value: unknown): value is Tool =>
  value === "none" || value === "ramp" || value === "landing" || value === "delete";

const isLegacyTool = (value: unknown): value is "platform" => value === "platform";

const measurementKeys: MeasurementKey[] = ["L1", "L2", "W1", "W2", "H", "E"];

const normaliseMeasurements = (value: any, elevationMm: number): MeasurementState => {
  const fallback = (defaultValue: boolean): boolean => (typeof defaultValue === "boolean" ? defaultValue : true);

  const legacyEnabled = value?.enabled;
  const legacySides = value?.sides;

  const base: MeasurementState = {
    L1: fallback(legacyEnabled?.L ?? true),
    L2: fallback(legacyEnabled?.L ?? true),
    W1: fallback(legacyEnabled?.W ?? true),
    W2: fallback(legacyEnabled?.W ?? true),
    H: fallback(legacyEnabled?.H ?? true),
    E: fallback(legacyEnabled?.E ?? elevationMm > 0),
  };

  const lSide = legacySides?.L === "one" ? "one" : legacySides?.L === "both" ? "both" : undefined;
  const wSide = legacySides?.W === "one" ? "one" : legacySides?.W === "both" ? "both" : undefined;

  if (lSide === "one") base.L2 = false;
  if (wSide === "one") base.W2 = false;

  const keyedOverrides =
    value && typeof value === "object"
      ? measurementKeys.reduce<Partial<MeasurementState>>((acc, key) => {
          const candidate = value[key];
          if (typeof candidate === "boolean") {
            acc[key] = candidate;
          }
          return acc;
        }, {})
      : {};

  return { ...base, ...keyedOverrides };
};

const toRamp = (value: any): RampObj | null => {
  if (!value || value.kind !== "ramp" || !isString(value.id) || !isNumber(value.xMm) || !isNumber(value.yMm)) return null;

  const lengthMm = isNumber(value.lengthMm) ? value.lengthMm : isNumber(value.runMm) ? value.runMm : DEFAULT_RAMP_RUN_MM;
  const widthMm = isNumber(value.widthMm) ? value.widthMm : DEFAULT_RAMP_WIDTH_MM;
  const heightMm = isNumber(value.heightMm) ? value.heightMm : DEFAULT_RAMP_HEIGHT_MM;

  return {
    id: value.id,
    kind: "ramp",
    xMm: value.xMm,
    yMm: value.yMm,
    lengthMm,
    widthMm,
    heightMm,
    elevationMm: isNumber(value.elevationMm) ? value.elevationMm : 0,
    rotationDeg: isNumber(value.rotationDeg) ? value.rotationDeg : 0,
    locked: isBoolean(value.locked) ? value.locked : false,
    measurements: normaliseMeasurements(value.measurements, value.elevationMm ?? 0),
    runMm: isNumber(value.runMm) ? value.runMm : lengthMm,
    showArrow: isBoolean(value.showArrow) ? value.showArrow : true,
    hasLeftWing: isBoolean(value.hasLeftWing) ? value.hasLeftWing : false,
    leftWingSizeMm: isNumber(value.leftWingSizeMm) ? value.leftWingSizeMm : 0,
    hasRightWing: isBoolean(value.hasRightWing) ? value.hasRightWing : false,
    rightWingSizeMm: isNumber(value.rightWingSizeMm) ? value.rightWingSizeMm : 0,
  };
};

const toLanding = (value: any): LandingObj | null => {
  if (
    !value ||
    (value.kind !== "landing" && value.kind !== "platform") ||
    !isString(value.id) ||
    !isNumber(value.xMm) ||
    !isNumber(value.yMm)
  )
    return null;

  const lengthMm = isNumber(value.lengthMm) ? value.lengthMm : DEFAULT_LANDING_LENGTH_MM;
  const widthMm = isNumber(value.widthMm) ? value.widthMm : DEFAULT_LANDING_WIDTH_MM;
  const heightMm = isNumber(value.heightMm)
    ? value.heightMm
    : isNumber(value.thicknessMm)
      ? value.thicknessMm
      : DEFAULT_LANDING_HEIGHT_MM;

  return {
    id: value.id,
    kind: "landing",
    xMm: value.xMm,
    yMm: value.yMm,
    lengthMm,
    widthMm,
    heightMm,
    elevationMm: isNumber(value.elevationMm) ? value.elevationMm : 0,
    rotationDeg: isNumber(value.rotationDeg) ? value.rotationDeg : 0,
    locked: isBoolean(value.locked) ? value.locked : false,
    measurements: normaliseMeasurements(value.measurements, value.elevationMm ?? 0),
  };
};

const toObject2D = (value: any): Object2D | null => {
  if (value?.kind === "ramp") return toRamp(value);
  if (value?.kind === "landing" || value?.kind === "platform") return toLanding(value);
  return null;
};

const cloneMeasurements = (value: MeasurementState): MeasurementState =>
  measurementKeys.reduce<MeasurementState>((acc, key) => ({ ...acc, [key]: value[key] }), {} as MeasurementState);

const cloneObject = (obj: Object2D): Object2D =>
  obj.kind === "ramp"
    ? { ...obj, measurements: cloneMeasurements(obj.measurements) }
    : { ...obj, measurements: cloneMeasurements(obj.measurements) };

const isPersistedEnvelope = (value: any): value is PersistedEnvelope =>
  value &&
  value.schemaVersion === SCHEMA_VERSION &&
  isNumber(value.savedAt) &&
  value.data;

const normaliseTool = (value: any): Tool | null => {
  if (isTool(value)) return value;
  if (isLegacyTool(value)) return "landing";
  return null;
};

const normaliseProject = (value: any): PersistedProject | null => {
  if (!value || !isMode(value.mode)) return null;
  const activeTool = normaliseTool(value.activeTool);
  if (!activeTool) return null;
  if (!isBoolean(value.snapOn)) return null;
  if (!Array.isArray(value.objects)) return null;

  const objects = value.objects
    .map(toObject2D)
    .filter((obj): obj is Object2D => Boolean(obj))
    .map((obj) => cloneObject(obj));

  const selectedId = value.selectedId === null || isString(value.selectedId) ? value.selectedId ?? null : null;

  return {
    mode: value.mode,
    activeTool,
    snapOn: value.snapOn,
    objects,
    selectedId,
  };
};

const cloneProject = (data: PersistedProject): PersistedProject => ({
  ...data,
  objects: data.objects.map((obj) => cloneObject(obj)),
});

export function saveProject(state: PersistedProject) {
  if (!hasLocalStorage()) return;

  const payload: PersistedEnvelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: Date.now(),
    data: cloneProject(state),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist project", error);
  }
}

export function loadProject(): PersistedProject | null {
  if (!hasLocalStorage()) return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isPersistedEnvelope(parsed)) return null;
    const normalised = normaliseProject(parsed.data);
    if (!normalised) return null;
    return cloneProject(normalised);
  } catch (error) {
    console.warn("Failed to restore project", error);
    return null;
  }
}
