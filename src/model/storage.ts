import { Object2D, PlatformObj, RampObj, Tool } from "./types";

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
  data: PersistedProject;
};

const hasLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isString = (value: unknown): value is string => typeof value === "string";
const isMode = (value: unknown): value is "2d" | "3d" => value === "2d" || value === "3d";
const isTool = (value: unknown): value is Tool => value === "none" || value === "ramp" || value === "platform" || value === "delete";

const isRamp = (value: any): value is RampObj =>
  value &&
  value.kind === "ramp" &&
  isString(value.id) &&
  isNumber(value.xMm) &&
  isNumber(value.yMm) &&
  isNumber(value.rotationDeg) &&
  isNumber(value.elevationMm) &&
  isBoolean(value.locked) &&
  isNumber(value.runMm) &&
  isNumber(value.widthMm) &&
  isNumber(value.heightMm) &&
  isBoolean(value.showArrow);

const isPlatform = (value: any): value is PlatformObj =>
  value &&
  value.kind === "platform" &&
  isString(value.id) &&
  isNumber(value.xMm) &&
  isNumber(value.yMm) &&
  isNumber(value.rotationDeg) &&
  isNumber(value.elevationMm) &&
  isBoolean(value.locked) &&
  isNumber(value.lengthMm) &&
  isNumber(value.widthMm) &&
  isNumber(value.thicknessMm);

const isObject2D = (value: any): value is Object2D => isRamp(value) || isPlatform(value);

const isPersistedProject = (value: any): value is PersistedProject =>
  value &&
  isMode(value.mode) &&
  isTool(value.activeTool) &&
  isBoolean(value.snapOn) &&
  Array.isArray(value.objects) &&
  value.objects.every(isObject2D) &&
  (value.selectedId === null || isString(value.selectedId));

const isPersistedEnvelope = (value: any): value is PersistedEnvelope =>
  value &&
  value.schemaVersion === SCHEMA_VERSION &&
  isNumber(value.savedAt) &&
  isPersistedProject(value.data);

const cloneProject = (data: PersistedProject): PersistedProject => ({
  ...data,
  objects: data.objects.map((obj) => ({ ...obj })),
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
    return cloneProject(parsed.data);
  } catch (error) {
    console.warn("Failed to restore project", error);
    return null;
  }
}
