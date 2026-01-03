export type Tool = "none" | "ramp" | "landing" | "delete";

export type ObjectKind = "ramp" | "landing" | "stairs";

export type MeasurementKey = "L1" | "L2" | "W1" | "W2" | "H" | "E";

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

export type Object2D = RampObj | LandingObj;

export type Snapshot = {
  snapOn: boolean;
  objects: Object2D[];
  selectedId: string | null;
};
