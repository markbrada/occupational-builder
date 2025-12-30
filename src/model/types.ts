export type BuilderMode = "edit" | "preview";

export type Tool = "ramp" | "platform" | "select" | "delete";

export const PX_PER_MM = 0.1;
export const SNAP_MM = 100;

export interface BuilderState {
  mode: BuilderMode;
}

export interface PointMm {
  xMm: number;
  yMm: number;
}

interface CanvasObjectBase {
  id: string;
  type: "ramp" | "platform";
  xMm: number;
  yMm: number;
  rotationDeg: number;
  locked: boolean;
}

export interface Ramp2D extends CanvasObjectBase {
  type: "ramp";
  runMm: number;
  widthMm: number;
  heightMm: number;
  elevationMm: number;
  showArrow: boolean;
}

export interface Platform2D extends CanvasObjectBase {
  type: "platform";
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  elevationMm: number;
}

export type CanvasObject2D = Ramp2D | Platform2D;
