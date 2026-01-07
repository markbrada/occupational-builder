export type Tool = "none" | "ramp" | "landing" | "dimension" | "delete";

export type ObjectKind = "ramp" | "landing" | "dimension" | "stairs";

export type MeasurementKey = "L1" | "L2" | "W1" | "W2" | "WL" | "WR" | "H" | "E";

export type MeasurementState = Record<MeasurementKey, boolean>;

export type BaseObj = {
  id: string;
  kind: ObjectKind;
  xMm: number;
  yMm: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  elevationMm: number;
  rotationDeg: number;
  locked: boolean;
  measurements: MeasurementState;
  measurementOffsets: Record<MeasurementKey, number>;
};

export type RampObj = BaseObj & {
  kind: "ramp";
  showArrow: boolean;
  hasLeftWing: boolean;
  leftWingSizeMm: number;
  hasRightWing: boolean;
  rightWingSizeMm: number;
  runMm: number;
};

export type LandingObj = BaseObj & {
  kind: "landing";
};

export type DimensionObj = {
  id: string;
  kind: "dimension";
  xMm: number;
  yMm: number;
  rotationDeg: number;
  locked: boolean;
  startMm: { xMm: number; yMm: number };
  endMm: { xMm: number; yMm: number };
  offsetMm: number;
};

export type Object2D = RampObj | LandingObj | DimensionObj;

export type SnapIncrementMm = 1 | 10 | 100 | 1000;

export type Snapshot = {
  snapToGrid: boolean;
  snapToObjects: boolean;
  snapIncrementMm: SnapIncrementMm;
  objects: Object2D[];
  selectedId: string | null;
};
