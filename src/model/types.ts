export type Tool = "ramp" | "platform" | "delete";
export type ActiveTool = Tool | null;

export type ObjectKind = "ramp" | "platform";

export interface BaseObj {
  id: string;
  kind: ObjectKind;
  xMm: number;
  yMm: number;
  rotationDeg: number;
  elevationMm: number;
  locked: boolean;
}

export interface RampObj extends BaseObj {
  kind: "ramp";
  runMm: number;
  widthMm: number;
  heightMm: number;
  showArrow: boolean;
}

export interface PlatformObj extends BaseObj {
  kind: "platform";
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
}

export type Object2D = RampObj | PlatformObj;

export interface BuilderState {
  mode: "edit" | "preview";
  activeTool: ActiveTool;
  snapOn: boolean;
  objects: Object2D[];
  selectedId: string | null;
}
