export const GRID_STEP_MM = 100;

const MM_PER_PX = 10;

export const mmToPx = (mm: number): number => mm / MM_PER_PX;

export const pxToMm = (px: number): number => px * MM_PER_PX;

export const snapMm = (mm: number, stepMm = GRID_STEP_MM): number => Math.round(mm / stepMm) * stepMm;
