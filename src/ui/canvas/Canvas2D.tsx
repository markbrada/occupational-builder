import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { BaseObj, LandingObj, Object2D, RampObj, SnapIncrementMm, Tool } from "../../model/types";
import { newLandingAt, newRampAt } from "../../model/defaults";
import { centerFromTopLeftMm, getDefaultBoundingBoxMm, getObjectBoundingBoxMm, topLeftFromCenterMm } from "../../model/geometry";
import { mmToPx, pxToMm, snapMm } from "../../model/units";
import Grid2D from "./Grid2D";
import ShapeLanding2D from "./ShapeLanding2D";
import ShapeRamp2D from "./ShapeRamp2D";

type CanvasSize = {
  width: number;
  height: number;
};

type Canvas2DProps = {
  activeTool: Tool;
  snapToGrid: boolean;
  snapToObjects: boolean;
  snapIncrementMm: SnapIncrementMm;
  objects: Object2D[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onPlaceAt: (tool: Tool, xMm: number, yMm: number) => void;
  onUpdateObject: (id: string, patch: Partial<Object2D> | Partial<BaseObj>, commit?: boolean) => void;
  onDeleteObject: (id: string) => void;
  onSetActiveTool: (tool: Tool) => void;
};

type PointerState = { x: number; y: number } | null;
type PointMm = { xMm: number; yMm: number };

type AabbMm = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
};

type SnapGuideState = {
  snappedX?: number;
  snappedY?: number;
  snappedPoint: { xMm: number; yMm: number } | null;
};

type SnapAxisCandidate = {
  delta: number;
  snapCoord: number;
  type: "face" | "poi";
  poiName?: string;
  targetPoint?: { x: number; y: number };
};

type Camera = {
  scale: number;
  txPx: number;
  tyPx: number;
};

type ScreenPoint = { x: number; y: number };
type HandleCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

type ResizeSession = {
  objectId: string;
  corner: HandleCorner;
  anchor: PointMm;
  rotationDeg: number;
  dirX: number;
  dirY: number;
};

const SNAP_THRESHOLD_MM = 20;
const WORKSPACE_SIZE_MM = 40000;
const HALF_WORKSPACE_MM = WORKSPACE_SIZE_MM / 2;
const MIN_SCALE = 0.16;
const MAX_SCALE = 10;
const VISIBLE_RATIO = 0.6;
const WORKSPACE_HALF_PX = mmToPx(HALF_WORKSPACE_MM);
const MIN_INCREMENT_MM = 1;
const MIN_OBJECT_SIZE_MM = 100;
const HANDLE_SIZE_PX = 12;
const HANDLE_STROKE_PX = 2;

const getAabbMm = (obj: Object2D, centerOverride?: PointMm): AabbMm => {
  const size = getObjectBoundingBoxMm(obj);
  const center = { xMm: centerOverride?.xMm ?? obj.xMm, yMm: centerOverride?.yMm ?? obj.yMm };
  const topLeft = topLeftFromCenterMm(center, size);
  const left = topLeft.xMm;
  const top = topLeft.yMm;
  const cx = center.xMm + (size.offsetXMm ?? 0);
  const cy = center.yMm + (size.offsetYMm ?? 0);
  return {
    left,
    right: left + size.widthMm,
    top,
    bottom: top + size.heightMm,
    cx,
    cy,
    w: size.widthMm,
    h: size.heightMm,
  };
};

const getPoisMm = (aabb: AabbMm) => (
  [
    { name: "topLeft", x: aabb.left, y: aabb.top },
    { name: "topRight", x: aabb.right, y: aabb.top },
    { name: "bottomLeft", x: aabb.left, y: aabb.bottom },
    { name: "bottomRight", x: aabb.right, y: aabb.bottom },
    { name: "midTop", x: aabb.cx, y: aabb.top },
    { name: "midBottom", x: aabb.cx, y: aabb.bottom },
    { name: "midLeft", x: aabb.left, y: aabb.cy },
    { name: "midRight", x: aabb.right, y: aabb.cy },
    { name: "centre", x: aabb.cx, y: aabb.cy },
  ] satisfies Array<{ name: string; x: number; y: number }>
);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const screenToWorldPx = (point: ScreenPoint, camera: Camera) => ({
  x: (point.x - camera.txPx) / camera.scale,
  y: (point.y - camera.tyPx) / camera.scale,
});

const screenToWorldMm = (point: ScreenPoint, camera: Camera): PointMm => {
  const worldPx = screenToWorldPx(point, camera);
  return { xMm: pxToMm(worldPx.x), yMm: pxToMm(worldPx.y) };
};

const worldToScreen = (point: PointMm, camera: Camera): ScreenPoint => {
  const px = mmToPx(point.xMm);
  const py = mmToPx(point.yMm);
  return {
    x: px * camera.scale + camera.txPx,
    y: py * camera.scale + camera.tyPx,
  };
};

const clampCamera = (camera: Camera, viewport: CanvasSize): Camera => {
  const halfWorkspacePxScaled = WORKSPACE_HALF_PX * camera.scale;
  const workspaceWidthScreen = halfWorkspacePxScaled * 2;
  const workspaceHeightScreen = workspaceWidthScreen;

  const minVisibleWidth = Math.min(workspaceWidthScreen * VISIBLE_RATIO, viewport.width);
  const minVisibleHeight = Math.min(workspaceHeightScreen * VISIBLE_RATIO, viewport.height);

  const screenLeft = camera.txPx - halfWorkspacePxScaled;
  const screenRight = camera.txPx + halfWorkspacePxScaled;
  const screenTop = camera.tyPx - halfWorkspacePxScaled;
  const screenBottom = camera.tyPx + halfWorkspacePxScaled;

  const minTx = minVisibleWidth - halfWorkspacePxScaled;
  const maxTx = viewport.width - minVisibleWidth + halfWorkspacePxScaled;
  const minTy = minVisibleHeight - halfWorkspacePxScaled;
  const maxTy = viewport.height - minVisibleHeight + halfWorkspacePxScaled;

  const txPx = clamp(
    screenRight < minVisibleWidth ? minTx : screenLeft > viewport.width - minVisibleWidth ? maxTx : camera.txPx,
    minTx,
    maxTx,
  );
  const tyPx = clamp(
    screenBottom < minVisibleHeight ? minTy : screenTop > viewport.height - minVisibleHeight ? maxTy : camera.tyPx,
    minTy,
    maxTy,
  );

  return {
    scale: camera.scale,
    txPx,
    tyPx,
  };
};

const rotatePointByDeg = (point: PointMm, rotationDeg: number): PointMm => {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { xMm: point.xMm * cos - point.yMm * sin, yMm: point.xMm * sin + point.yMm * cos };
};

const getBodySize = (obj: Object2D) => {
  if (obj.kind === "ramp") {
    return { lengthMm: obj.runMm, widthMm: obj.widthMm };
  }
  return { lengthMm: obj.lengthMm, widthMm: obj.widthMm };
};

const getHandleLocalPoint = (obj: Object2D, corner: HandleCorner): PointMm => {
  const { lengthMm, widthMm } = getBodySize(obj);
  const halfLength = lengthMm / 2;
  const halfWidth = widthMm / 2;
  const isLeft = corner === "topLeft" || corner === "bottomLeft";
  const isTop = corner === "topLeft" || corner === "topRight";
  return { xMm: isLeft ? -halfLength : halfLength, yMm: isTop ? -halfWidth : halfWidth };
};

const getHandleWorldPoint = (obj: Object2D, corner: HandleCorner): PointMm => {
  const rotated = rotatePointByDeg(getHandleLocalPoint(obj, corner), obj.rotationDeg);
  return { xMm: obj.xMm + rotated.xMm, yMm: obj.yMm + rotated.yMm };
};

const handleConfig: Record<
  HandleCorner,
  { anchor: HandleCorner; dirX: number; dirY: number; cursor: "nwse-resize" | "nesw-resize" }
> = {
  topLeft: { anchor: "bottomRight", dirX: -1, dirY: -1, cursor: "nwse-resize" },
  topRight: { anchor: "bottomLeft", dirX: 1, dirY: -1, cursor: "nesw-resize" },
  bottomLeft: { anchor: "topRight", dirX: -1, dirY: 1, cursor: "nesw-resize" },
  bottomRight: { anchor: "topLeft", dirX: 1, dirY: 1, cursor: "nwse-resize" },
};

const getHandleCornerPointsMm = (obj: Object2D): Record<HandleCorner, PointMm> => ({
  topLeft: getHandleWorldPoint(obj, "topLeft"),
  topRight: getHandleWorldPoint(obj, "topRight"),
  bottomLeft: getHandleWorldPoint(obj, "bottomLeft"),
  bottomRight: getHandleWorldPoint(obj, "bottomRight"),
});
export default function Canvas2D({
  activeTool,
  snapToGrid,
  snapToObjects,
  snapIncrementMm,
  objects,
  selectedId,
  onSelect,
  onClearSelection,
  onPlaceAt,
  onUpdateObject,
  onDeleteObject,
  onSetActiveTool,
}: Canvas2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<any>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [pointer, setPointer] = useState<PointerState>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverHandle, setHoverHandle] = useState<HandleCorner | null>(null);
  const [snapGuide, setSnapGuide] = useState<SnapGuideState>({ snappedPoint: null });
  const [spacePanning, setSpacePanning] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeSession | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef<ScreenPoint | null>(null);
  const resizeCommittedRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    let frame: number | null = null;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;

      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;

        setSize((current) => {
          const next = {
            width: Math.floor(width),
            height: Math.floor(height),
          };

          if (current.width === next.width && current.height === next.height) {
            return current;
          }

          return next;
        });
      });
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  const hasSize = size.width > 0 && size.height > 0;

  useEffect(() => {
    if (!hasSize) return;
    setCamera((current) => {
      const baseWorkspacePx = mmToPx(WORKSPACE_SIZE_MM);
      const fitScale = Math.min(size.width / (baseWorkspacePx * 1.1), size.height / (baseWorkspacePx * 1.1));
      const scale = clamp(current?.scale ?? fitScale, MIN_SCALE, MAX_SCALE);
      const txPx = current?.txPx ?? size.width / 2;
      const tyPx = current?.tyPx ?? size.height / 2;
      const next = clampCamera({ scale, txPx, tyPx }, size);
      if (current && current.scale === next.scale && current.txPx === next.txPx && current.tyPx === next.tyPx) {
        return current;
      }
      return next;
    });
  }, [hasSize, size]);

  useEffect(() => {
    if (!hasSize || !camera) return;
    setCamera((current) => {
      if (!current) return camera;
      const clamped = clampCamera(current, size);
      if (clamped.scale === current.scale && clamped.txPx === current.txPx && clamped.tyPx === current.tyPx) {
        return current;
      }
      return clamped;
    });
  }, [camera, hasSize, size]);

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = (activeEl?.tagName || "").toLowerCase();
      const isTyping = ["input", "textarea", "select"].includes(activeTag) || activeEl?.isContentEditable;
      if (isTyping) return;
      if (evt.code === "Space") {
        setSpacePanning(true);
      }
    };

    const handleKeyUp = (evt: KeyboardEvent) => {
      if (evt.code === "Space") {
        setSpacePanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    setResizeState(null);
    resizeCommittedRef.current = false;
    setHoverHandle(null);
  }, [selectedId]);

  const pointerMm: PointMm | null = useMemo(() => {
    if (!pointer || !camera) return null;
    return screenToWorldMm(pointer, camera);
  }, [camera, pointer]);

  const pointerMmClamped: PointMm | null = useMemo(() => {
    if (!pointerMm) return null;
    return {
      xMm: clamp(pointerMm.xMm, -HALF_WORKSPACE_MM, HALF_WORKSPACE_MM),
      yMm: clamp(pointerMm.yMm, -HALF_WORKSPACE_MM, HALF_WORKSPACE_MM),
    };
  }, [pointerMm]);

  const desiredAnchorMm: PointMm | null = useMemo(() => {
    if (!pointerMmClamped) return null;
    const stepMm = snapToGrid ? snapIncrementMm : MIN_INCREMENT_MM;
    return { xMm: snapMm(pointerMmClamped.xMm, stepMm), yMm: snapMm(pointerMmClamped.yMm, stepMm) };
  }, [pointerMmClamped, snapIncrementMm, snapToGrid]);

  const snapMarkerPx = useMemo(() => {
    if (!desiredAnchorMm || !snapToGrid) return null;
    return { x: mmToPx(desiredAnchorMm.xMm), y: mmToPx(desiredAnchorMm.yMm) };
  }, [desiredAnchorMm, snapToGrid]);

  const worldGroupProps = camera
    ? { x: camera.txPx, y: camera.tyPx, scaleX: camera.scale, scaleY: camera.scale }
    : { x: 0, y: 0, scaleX: 1, scaleY: 1 };

  const workspaceClip = {
    clipX: -WORKSPACE_HALF_PX,
    clipY: -WORKSPACE_HALF_PX,
    clipWidth: WORKSPACE_HALF_PX * 2,
    clipHeight: WORKSPACE_HALF_PX * 2,
  };

  const snapStrokeWidth = camera ? 1 / camera.scale : 1;
  const clampedSnapX =
    snapGuide.snappedX !== undefined ? clamp(mmToPx(snapGuide.snappedX), -WORKSPACE_HALF_PX, WORKSPACE_HALF_PX) : null;
  const clampedSnapY =
    snapGuide.snappedY !== undefined ? clamp(mmToPx(snapGuide.snappedY), -WORKSPACE_HALF_PX, WORKSPACE_HALF_PX) : null;
  const snapPointRadius = camera ? 4 / camera.scale : 4;

  const getPlacementCentreFromAnchor = (tool: Tool, anchor: PointMm): PointMm | null => {
    const bbox = getDefaultBoundingBoxMm(tool);
    if (!bbox) return null;
    const stepMm = snapToGrid ? snapIncrementMm : MIN_INCREMENT_MM;
    const snappedTopLeft = { xMm: snapMm(anchor.xMm, stepMm), yMm: snapMm(anchor.yMm, stepMm) };
    return centerFromTopLeftMm(snappedTopLeft, bbox);
  };

  const ghostRamp: RampObj | null = useMemo(() => {
    if (!desiredAnchorMm || activeTool !== "ramp") return null;
    const centre = getPlacementCentreFromAnchor("ramp", desiredAnchorMm);
    if (!centre) return null;
    return {
      ...newRampAt(centre.xMm, centre.yMm),
      id: "ghost-ramp",
      locked: true,
    };
  }, [activeTool, desiredAnchorMm]);

  const ghostLanding: LandingObj | null = useMemo(() => {
    if (!desiredAnchorMm || activeTool !== "landing") return null;
    const centre = getPlacementCentreFromAnchor("landing", desiredAnchorMm);
    if (!centre) return null;
    return {
      ...newLandingAt(centre.xMm, centre.yMm),
      id: "ghost-landing",
      locked: true,
    };
  }, [activeTool, desiredAnchorMm]);

  const handleStagePointerMove = () => {
    if (!stageRef.current || !camera) return;
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;

    if (resizeState) {
      handleResizeDrag(pos);
    }

    if (isPanningRef.current) {
      const last = lastPanRef.current ?? pos;
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      setCamera((current) => {
        if (!current) return current;
        const next = clampCamera({ ...current, txPx: current.txPx + dx, tyPx: current.tyPx + dy }, size);
        return next;
      });
      lastPanRef.current = pos;
    }

    setPointer({ x: pos.x, y: pos.y });
  };

  const stopPanning = () => {
    isPanningRef.current = false;
    lastPanRef.current = null;
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
  };

  const handleStageMouseUp = () => {
    setResizeState(null);
    resizeCommittedRef.current = false;
    setDraggingId(null);
    setSnapGuide({ snappedPoint: null });
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
    stopPanning();
  };

  const handleStageLeave = () => {
    stopPanning();
    setPointer(null);
    setHoverId(null);
    setHoverHandle(null);
    setResizeState(null);
    resizeCommittedRef.current = false;
    setDraggingId(null);
    setSnapGuide({ snappedPoint: null });
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
  };

  const handleStageMouseDown = (evt: any) => {
    if (!stageRef.current || !camera) return;
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;

    const isRightButton = evt.evt?.button === 2;
    const canPan = isRightButton || (spacePanning && evt.evt?.button === 0);
    if (canPan) {
      isPanningRef.current = true;
      lastPanRef.current = pos;
      stageRef.current.container().style.cursor = "grab";
      return;
    }

    const isStageClick = evt.target === stageRef.current || evt.target === stageRef.current.getStage();

    if ((activeTool === "ramp" || activeTool === "landing") && isStageClick) {
      const anchor = screenToWorldMm(pos, camera);
      const clampedAnchor = {
        xMm: clamp(anchor.xMm, -HALF_WORKSPACE_MM, HALF_WORKSPACE_MM),
        yMm: clamp(anchor.yMm, -HALF_WORKSPACE_MM, HALF_WORKSPACE_MM),
      };
      const centre = getPlacementCentreFromAnchor(activeTool, clampedAnchor);
      if (!centre) return;
      onPlaceAt(activeTool, centre.xMm, centre.yMm);
      return;
    }

    if (isStageClick) {
      onClearSelection();
      if (activeTool === "delete") {
        onSetActiveTool("none");
      }
    }

    evt.cancelBubble = true;
  };

  const handleWheel = (evt: any) => {
    if (!stageRef.current || !camera) return;
    evt.evt.preventDefault();
    const pointerPosition = stageRef.current.getPointerPosition();
    if (!pointerPosition) return;
    const scaleBy = evt.evt.deltaY < 0 ? 1.1 : 0.9;
    setCamera((current) => {
      if (!current) return current;
      const worldPosPx = screenToWorldPx(pointerPosition, current);
      const nextScale = clamp(current.scale * scaleBy, MIN_SCALE, MAX_SCALE);
      const nextTx = pointerPosition.x - worldPosPx.x * nextScale;
      const nextTy = pointerPosition.y - worldPosPx.y * nextScale;
      return clampCamera({ scale: nextScale, txPx: nextTx, tyPx: nextTy }, size);
    });
  };

  const handleContextMenu = (evt: any) => {
    evt.evt.preventDefault();
    onSetActiveTool("none");
  };

  const handleObjectPointerDown = (evt: any, obj: Object2D) => {
    if (evt?.evt?.button === 2 || spacePanning) {
      return;
    }
    onSelect(obj.id);
    if (activeTool === "delete") {
      onDeleteObject(obj.id);
      onSetActiveTool("none");
    }
    evt.cancelBubble = true;
  };

  const handleObjectDragStart = (obj: Object2D) => {
    setDraggingId(obj.id);
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "grabbing";
    }
  };

  const handleResizeDrag = (pos: ScreenPoint) => {
    if (!resizeState || !camera) return;
    const obj = objects.find((candidate) => candidate.id === resizeState.objectId);
    if (!obj || obj.locked) return;

    const resizeStepMm = snapToGrid ? snapIncrementMm : MIN_INCREMENT_MM;
    const pointerMm = screenToWorldMm(pos, camera);
    const relX = pointerMm.xMm - resizeState.anchor.xMm;
    const relY = pointerMm.yMm - resizeState.anchor.yMm;

    const rad = (resizeState.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const localX = relX * cos + relY * sin;
    const localY = -relX * sin + relY * cos;

    const enforceDirectionalMin = (value: number, dir: number) =>
      dir === 1 ? Math.max(value, MIN_OBJECT_SIZE_MM) : Math.min(value, -MIN_OBJECT_SIZE_MM);

    const constrainedLocalX = enforceDirectionalMin(localX, resizeState.dirX);
    const constrainedLocalY = enforceDirectionalMin(localY, resizeState.dirY);

    const snappedLength = snapMm(Math.abs(constrainedLocalX), resizeStepMm);
    const snappedWidth = snapMm(Math.abs(constrainedLocalY), resizeStepMm);

    const movingCornerWorld = {
      xMm: resizeState.anchor.xMm + resizeState.dirX * snappedLength * cos - resizeState.dirY * snappedWidth * sin,
      yMm: resizeState.anchor.yMm + resizeState.dirX * snappedLength * sin + resizeState.dirY * snappedWidth * cos,
    };

    const xCandidates: SnapAxisCandidate[] = [];
    const yCandidates: SnapAxisCandidate[] = [];

    if (snapToObjects) {
      const activePoi = { name: "corner", x: movingCornerWorld.xMm, y: movingCornerWorld.yMm };
      const otherObjects = objects.filter((o) => o.id !== obj.id);

      const pushFaceCandidate = (activeCoord: number, targetCoord: number, axis: "x" | "y") => {
        const delta = targetCoord - activeCoord;
        if (Math.abs(delta) > SNAP_THRESHOLD_MM) return;
        const candidate: SnapAxisCandidate = { delta, snapCoord: targetCoord, type: "face" };
        if (axis === "x") {
          xCandidates.push(candidate);
        } else {
          yCandidates.push(candidate);
        }
      };

      const pushPoiCandidate = (targetPoi: { name: string; x: number; y: number }) => {
        const deltaX = targetPoi.x - activePoi.x;
        const deltaY = targetPoi.y - activePoi.y;
        if (Math.abs(deltaX) <= SNAP_THRESHOLD_MM) {
          xCandidates.push({
            delta: deltaX,
            snapCoord: targetPoi.x,
            type: "poi",
            poiName: activePoi.name,
            targetPoint: { x: targetPoi.x, y: targetPoi.y },
          });
        }
        if (Math.abs(deltaY) <= SNAP_THRESHOLD_MM) {
          yCandidates.push({
            delta: deltaY,
            snapCoord: targetPoi.y,
            type: "poi",
            poiName: activePoi.name,
            targetPoint: { x: targetPoi.x, y: targetPoi.y },
          });
        }
      };

      otherObjects.forEach((other) => {
        const targetAabb = getAabbMm(other);
        const targetPois = getPoisMm(targetAabb);
        const targetXFaces = [targetAabb.left, targetAabb.cx, targetAabb.right];
        const targetYFaces = [targetAabb.top, targetAabb.cy, targetAabb.bottom];

        targetXFaces.forEach((faceX) => pushFaceCandidate(activePoi.x, faceX, "x"));
        targetYFaces.forEach((faceY) => pushFaceCandidate(activePoi.y, faceY, "y"));

        targetPois.forEach((poi) => pushPoiCandidate(poi));
      });
    }

    const bestX = pickBestAxisCandidate(xCandidates);
    const bestY = pickBestAxisCandidate(yCandidates);

    const xSnappedToObject = snapToObjects && Boolean(bestX);
    const ySnappedToObject = snapToObjects && Boolean(bestY);
    const snappedPoint =
      snapToObjects && (bestX?.type === "poi" ? bestX.targetPoint : bestY?.type === "poi" ? bestY.targetPoint : null);

    if (snapToObjects && (bestX || bestY)) {
      setSnapGuide({
        snappedX: xSnappedToObject ? bestX?.snapCoord : undefined,
        snappedY: ySnappedToObject ? bestY?.snapCoord : undefined,
        snappedPoint: snappedPoint ? { xMm: snappedPoint.x, yMm: snappedPoint.y } : null,
      });
    } else {
      setSnapGuide({ snappedPoint: null });
    }

    const snappedCornerWorld = {
      xMm: movingCornerWorld.xMm + (bestX ? bestX.delta : 0),
      yMm: movingCornerWorld.yMm + (bestY ? bestY.delta : 0),
    };

    const snappedRelX = snappedCornerWorld.xMm - resizeState.anchor.xMm;
    const snappedRelY = snappedCornerWorld.yMm - resizeState.anchor.yMm;

    const snappedLocalX = snappedRelX * cos + snappedRelY * sin;
    const snappedLocalY = -snappedRelX * sin + snappedRelY * cos;

    const snappedDirectionalX = enforceDirectionalMin(snappedLocalX, resizeState.dirX);
    const snappedDirectionalY = enforceDirectionalMin(snappedLocalY, resizeState.dirY);

    const nextLengthMm = Math.max(
      MIN_OBJECT_SIZE_MM,
      xSnappedToObject ? Math.abs(snappedDirectionalX) : snapMm(Math.abs(snappedDirectionalX), resizeStepMm),
    );
    const nextWidthMm = Math.max(
      MIN_OBJECT_SIZE_MM,
      ySnappedToObject ? Math.abs(snappedDirectionalY) : snapMm(Math.abs(snappedDirectionalY), resizeStepMm),
    );

    const centreLocal = {
      xMm: resizeState.dirX * nextLengthMm * 0.5,
      yMm: resizeState.dirY * nextWidthMm * 0.5,
    };

    const centreWorld = {
      xMm: resizeState.anchor.xMm + centreLocal.xMm * cos - centreLocal.yMm * sin,
      yMm: resizeState.anchor.yMm + centreLocal.xMm * sin + centreLocal.yMm * cos,
    };

    const patch: Partial<Object2D> =
      obj.kind === "ramp"
        ? { xMm: centreWorld.xMm, yMm: centreWorld.yMm, lengthMm: nextLengthMm, runMm: nextLengthMm, widthMm: nextWidthMm }
        : { xMm: centreWorld.xMm, yMm: centreWorld.yMm, lengthMm: nextLengthMm, widthMm: nextWidthMm };

    const shouldCommit = !resizeCommittedRef.current;
    onUpdateObject(obj.id, patch, shouldCommit);
    if (shouldCommit) {
      resizeCommittedRef.current = true;
    }
  };

  const handleResizePointerDown = (evt: any, obj: Object2D, corner: HandleCorner) => {
    if (obj.locked || activeTool === "delete" || spacePanning) return;
    const config = handleConfig[corner];
    const anchor = getHandleWorldPoint(obj, config.anchor);
    resizeCommittedRef.current = false;
    setResizeState({
      objectId: obj.id,
      corner,
      anchor,
      rotationDeg: obj.rotationDeg,
      dirX: config.dirX,
      dirY: config.dirY,
    });
    setHoverHandle(corner);
    if (stageRef.current) {
      stageRef.current.container().style.cursor = config.cursor;
    }
    evt.cancelBubble = true;
  };

  const pickBestAxisCandidate = (candidates: SnapAxisCandidate[]): SnapAxisCandidate | undefined => {
    const faceCandidates = candidates.filter((c) => c.type === "face");
    const pool = faceCandidates.length > 0 ? faceCandidates : candidates;
    return pool.reduce<SnapAxisCandidate | undefined>((best, current) => {
      if (!best) return current;
      if (Math.abs(current.delta) < Math.abs(best.delta)) return current;
      return best;
    }, undefined);
  };

  const getObjectSnap = (obj: Object2D, proposedCentre: PointMm) => {
    const bbox = getObjectBoundingBoxMm(obj);
    if (!snapToGrid && !snapToObjects) {
      setSnapGuide({ snappedPoint: null });
      const freeTopLeft = topLeftFromCenterMm(proposedCentre, bbox);
      const roundedTopLeft = {
        xMm: snapMm(freeTopLeft.xMm, MIN_INCREMENT_MM),
        yMm: snapMm(freeTopLeft.yMm, MIN_INCREMENT_MM),
      };
      return centerFromTopLeftMm(roundedTopLeft, bbox);
    }

    const xCandidates: SnapAxisCandidate[] = [];
    const yCandidates: SnapAxisCandidate[] = [];

    if (snapToObjects) {
      const activeAabb = getAabbMm(obj, proposedCentre);
      const activePois = getPoisMm(activeAabb);
      const otherObjects = objects.filter((o) => o.id !== obj.id);

      const pushFaceCandidates = (activeCoord: number, targetCoord: number, axis: "x" | "y") => {
        const delta = targetCoord - activeCoord;
        if (Math.abs(delta) > SNAP_THRESHOLD_MM) return;
        const candidate: SnapAxisCandidate = { delta, snapCoord: targetCoord, type: "face" };
        if (axis === "x") {
          xCandidates.push(candidate);
        } else {
          yCandidates.push(candidate);
        }
      };

      const pushPoiCandidates = (activePoi: { name: string; x: number; y: number }, targetPoi: { name: string; x: number; y: number }) => {
        const deltaX = targetPoi.x - activePoi.x;
        const deltaY = targetPoi.y - activePoi.y;
        if (Math.abs(deltaX) <= SNAP_THRESHOLD_MM) {
          xCandidates.push({
            delta: deltaX,
            snapCoord: targetPoi.x,
            type: "poi",
            poiName: activePoi.name,
            targetPoint: { x: targetPoi.x, y: targetPoi.y },
          });
        }
        if (Math.abs(deltaY) <= SNAP_THRESHOLD_MM) {
          yCandidates.push({
            delta: deltaY,
            snapCoord: targetPoi.y,
            type: "poi",
            poiName: activePoi.name,
            targetPoint: { x: targetPoi.x, y: targetPoi.y },
          });
        }
      };

      otherObjects.forEach((other) => {
        const targetAabb = getAabbMm(other);
        const targetPois = getPoisMm(targetAabb);

        // Face and centre alignments (priority)
        const activeXFaces = [activeAabb.left, activeAabb.cx, activeAabb.right];
        const targetXFaces = [targetAabb.left, targetAabb.cx, targetAabb.right];
        activeXFaces.forEach((activeFaceX) => {
          targetXFaces.forEach((targetFaceX) => pushFaceCandidates(activeFaceX, targetFaceX, "x"));
        });

        const activeYFaces = [activeAabb.top, activeAabb.cy, activeAabb.bottom];
        const targetYFaces = [targetAabb.top, targetAabb.cy, targetAabb.bottom];
        activeYFaces.forEach((activeFaceY) => {
          targetYFaces.forEach((targetFaceY) => pushFaceCandidates(activeFaceY, targetFaceY, "y"));
        });

        // POI matches (secondary)
        activePois.forEach((activePoi) => {
          targetPois.forEach((targetPoi) => pushPoiCandidates(activePoi, targetPoi));
        });
      });
    }

    const bestX = pickBestAxisCandidate(xCandidates);
    const bestY = pickBestAxisCandidate(yCandidates);

    const xSnappedToObject = snapToObjects && Boolean(bestX);
    const ySnappedToObject = snapToObjects && Boolean(bestY);

    const snappedAfterObject: PointMm = {
      xMm: proposedCentre.xMm + (bestX ? bestX.delta : 0),
      yMm: proposedCentre.yMm + (bestY ? bestY.delta : 0),
    };

    const snappedPoint =
      snapToObjects && (bestX?.type === "poi" ? bestX.targetPoint : bestY?.type === "poi" ? bestY.targetPoint : null);
    setSnapGuide(
      snapToObjects
        ? {
            snappedX: xSnappedToObject ? bestX?.snapCoord : undefined,
            snappedY: ySnappedToObject ? bestY?.snapCoord : undefined,
            snappedPoint: snappedPoint ? { xMm: snappedPoint.x, yMm: snappedPoint.y } : null,
          }
        : { snappedPoint: null },
    );

    const snappedTopLeft = topLeftFromCenterMm(snappedAfterObject, bbox);
    const shouldSnapGridX = snapToGrid && !xSnappedToObject;
    const shouldSnapGridY = snapToGrid && !ySnappedToObject;
    const baseGridStepX = shouldSnapGridX ? snapIncrementMm : MIN_INCREMENT_MM;
    const baseGridStepY = shouldSnapGridY ? snapIncrementMm : MIN_INCREMENT_MM;
    const gridSnappedTopLeft = {
      xMm: snapMm(snappedTopLeft.xMm, baseGridStepX),
      yMm: snapMm(snappedTopLeft.yMm, baseGridStepY),
    };

    return centerFromTopLeftMm(gridSnappedTopLeft, bbox);
  };

  const handleObjectDragEnd = (evt: any, obj: Object2D) => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
    setDraggingId((current) => (current === obj.id ? null : current));
    if (!camera) return;
    const absolute = evt.target.getAbsolutePosition();
    const proposedCentre = screenToWorldMm(absolute, camera);
    const snappedCentre = getObjectSnap(obj, proposedCentre);
    const snappedStage = worldToScreen(snappedCentre, camera);
    evt.target.setAbsolutePosition(snappedStage);
    onUpdateObject(obj.id, { xMm: snappedCentre.xMm, yMm: snappedCentre.yMm }, true);
    setSnapGuide({ snappedPoint: null });
  };

  const hudLabel = useMemo(() => {
    if (!pointer || (activeTool !== "ramp" && activeTool !== "landing")) return null;
    const label = activeTool === "ramp" ? "Click to place Ramp (Esc to cancel)" : "Click to place Landing (Esc to cancel)";
    return { text: label, x: pointer.x + 10, y: pointer.y + 12 };
  }, [activeTool, pointer]);

  const objectNodes = objects.map((obj) => {
    const isSelected = obj.id === selectedId;
    const isHover = obj.id === hoverId;
    const draggable = isSelected && !obj.locked && !spacePanning;
    const dragBoundFunc = (pos: any) => {
      if (!camera) return pos;
      const proposedCentre = screenToWorldMm(pos, camera);
      const snappedCentre = getObjectSnap(obj, proposedCentre);
      return worldToScreen(snappedCentre, camera);
    };
    const hoverHandlers = {
      onMouseEnter: () => setHoverId(obj.id),
      onMouseLeave: () => setHoverId((current) => (current === obj.id ? null : current)),
    };
    if (obj.kind === "ramp") {
      const rampProps = {
        key: obj.id,
        obj,
        selected: isSelected,
        hover: isHover,
        activeTool,
        draggable,
        dragBoundFunc,
        onPointerDown: (evt: any) => handleObjectPointerDown(evt, obj),
        onDragStart: () => handleObjectDragStart(obj),
        onDragEnd: (evt: any) => handleObjectDragEnd(evt, obj),
        ...hoverHandlers,
      };
      return <ShapeRamp2D {...rampProps} />;
    }
    const landingProps = {
      key: obj.id,
      obj,
      selected: isSelected,
      hover: isHover,
      activeTool,
      draggable,
      dragBoundFunc,
      onPointerDown: (evt: any) => handleObjectPointerDown(evt, obj),
      onDragStart: () => handleObjectDragStart(obj),
      onDragEnd: (evt: any) => handleObjectDragEnd(evt, obj),
      ...hoverHandlers,
    };
    return <ShapeLanding2D {...landingProps} />;
  });

  const selectedObject = selectedId ? objects.find((obj) => obj.id === selectedId) ?? null : null;
  const canResize = Boolean(selectedObject && !selectedObject.locked);
  const activeSelection = canResize && selectedObject ? selectedObject : null;
  const handlePoints = activeSelection ? getHandleCornerPointsMm(activeSelection) : null;
  const handleVisible = Boolean(handlePoints && !draggingId);
  const handleScale = camera ? 1 / camera.scale : 1;
  const handleSizePx = HANDLE_SIZE_PX * handleScale;
  const handleStrokeWidth = HANDLE_STROKE_PX * handleScale;
  const handleCornerRadius = 3 * handleScale;

  const resizeHandles =
    canResize && handleVisible && handlePoints
      ? (Object.entries(handlePoints) as Array<[HandleCorner, PointMm]>).map(([corner, point]) => {
          const config = handleConfig[corner];
          const x = mmToPx(point.xMm);
          const y = mmToPx(point.yMm);
          const isHover = hoverHandle === corner || resizeState?.corner === corner;
          const fill = isHover ? "#bfdbfe" : "#ffffff";
          const stroke = isHover ? "#2563eb" : "#1f2937";
          return (
            <Rect
              key={`handle-${corner}`}
              x={x - handleSizePx / 2}
              y={y - handleSizePx / 2}
              width={handleSizePx}
              height={handleSizePx}
              fill={fill}
              stroke={stroke}
              strokeWidth={handleStrokeWidth}
              cornerRadius={handleCornerRadius}
              onPointerDown={(evt) => activeSelection && handleResizePointerDown(evt, activeSelection, corner)}
              onMouseEnter={() => {
                setHoverHandle(corner);
                if (stageRef.current) {
                  stageRef.current.container().style.cursor = config.cursor;
                }
              }}
              onMouseLeave={() => {
                setHoverHandle((current) => (current === corner ? null : current));
                if (!resizeState && stageRef.current) {
                  stageRef.current.container().style.cursor = "";
                }
              }}
              listening={!spacePanning}
            />
          );
        })
      : null;

  return (
    <div className="ob-canvasHost" ref={containerRef} data-tool={activeTool}>
      {hasSize && camera ? (
        <>
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onMouseMove={handleStagePointerMove}
            onTouchMove={handleStagePointerMove}
            onMouseUp={handleStageMouseUp}
            onTouchEnd={handleStageMouseUp}
            onMouseLeave={handleStageLeave}
            onContextMenu={handleContextMenu}
            onMouseDown={handleStageMouseDown}
            onWheel={handleWheel}
          >
            <Layer listening={false}>
              <Group {...worldGroupProps}>
                <Grid2D cameraScale={camera.scale} workspaceSizeMm={WORKSPACE_SIZE_MM} gridStepMm={snapIncrementMm} />
              </Group>
            </Layer>

            <Layer>
              <Group {...worldGroupProps}>{objectNodes}</Group>
            </Layer>

            <Layer>
              <Group {...worldGroupProps}>{resizeHandles}</Group>
            </Layer>

            <Layer listening={false}>
              <Group {...worldGroupProps} {...workspaceClip}>
                {clampedSnapX !== null && (
                  <Line
                    points={[clampedSnapX, -WORKSPACE_HALF_PX, clampedSnapX, WORKSPACE_HALF_PX]}
                    stroke="rgba(239,68,68,0.5)"
                    strokeWidth={snapStrokeWidth}
                  />
                )}
                {clampedSnapY !== null && (
                  <Line
                    points={[-WORKSPACE_HALF_PX, clampedSnapY, WORKSPACE_HALF_PX, clampedSnapY]}
                    stroke="rgba(239,68,68,0.5)"
                    strokeWidth={snapStrokeWidth}
                  />
                )}
                {snapGuide.snappedPoint && (
                  <Circle
                    x={mmToPx(snapGuide.snappedPoint.xMm)}
                    y={mmToPx(snapGuide.snappedPoint.yMm)}
                    radius={snapPointRadius}
                    fill="rgba(239,68,68,0.5)"
                  />
                )}
                {snapMarkerPx && snapToGrid && (
                  <Circle x={snapMarkerPx.x} y={snapMarkerPx.y} radius={snapPointRadius} fill="#0ea5e9" opacity={0.85} />
                )}
                {ghostRamp && (
                  <ShapeRamp2D obj={ghostRamp} selected={false} hover={false} activeTool={activeTool} draggable={false} ghost />
                )}
                {ghostLanding && (
                  <ShapeLanding2D obj={ghostLanding} selected={false} hover={false} activeTool={activeTool} draggable={false} ghost />
                )}
                {pointerMmClamped && (
                  <>
                    <Line
                      points={[-WORKSPACE_HALF_PX, mmToPx(pointerMmClamped.yMm), WORKSPACE_HALF_PX, mmToPx(pointerMmClamped.yMm)]}
                      stroke="#cbd5e1"
                      dash={[4, 4]}
                      strokeWidth={snapStrokeWidth}
                    />
                    <Line
                      points={[mmToPx(pointerMmClamped.xMm), -WORKSPACE_HALF_PX, mmToPx(pointerMmClamped.xMm), WORKSPACE_HALF_PX]}
                      stroke="#cbd5e1"
                      dash={[4, 4]}
                      strokeWidth={snapStrokeWidth}
                    />
                  </>
                )}
              </Group>
              {hudLabel && (
                <Group x={hudLabel.x} y={hudLabel.y} listening={false}>
                  <Rect width={220} height={26} fill="rgba(17,24,39,0.8)" cornerRadius={6} />
                  <Text text={hudLabel.text} x={8} y={6} fontSize={12} fill="#e5e7eb" />
                </Group>
              )}
            </Layer>
          </Stage>
          <div className="ob-canvasHud">
            <div className="ob-canvasHud__item">Zoom: {Math.round(camera.scale * 100)}%</div>
            {pointerMmClamped && (
              <div className="ob-canvasHud__item">
                Cursor: {Math.round(pointerMmClamped.xMm)}mm, {Math.round(pointerMmClamped.yMm)}mm
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="canvas-placeholder">2D Canvas loading...</div>
      )}
    </div>
  );
}
