import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { DimensionSegment } from "../../model/geometry/dimensions";
import { BaseObj, LandingObj, MeasurementKey, Object2D, RampObj, Tool } from "../../model/types";
import { newLandingAt, newRampAt } from "../../model/defaults";
import { centerFromTopLeftMm, getDefaultBoundingBoxMm, getObjectBoundingBoxMm, topLeftFromCenterMm } from "../../model/geometry";
import { mmToPx, pxToMm, snapMm } from "../../model/units";
import Grid2D from "./Grid2D";
import Dimensions2D from "./Dimensions2D";
import ShapeLanding2D from "./ShapeLanding2D";
import ShapeRamp2D from "./ShapeRamp2D";

type CanvasSize = {
  width: number;
  height: number;
};

type Canvas2DProps = {
  activeTool: Tool;
  snapOn: boolean;
  objects: Object2D[];
  dimensions: DimensionSegment[];
  selectedId: string | null;
  selectedMeasurementKey: MeasurementKey | null;
  onSelect: (id: string) => void;
  onSelectMeasurement: (id: string, key: MeasurementKey) => void;
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

const SNAP_THRESHOLD_MM = 20;
const WORKSPACE_SIZE_MM = 40000;
const HALF_WORKSPACE_MM = WORKSPACE_SIZE_MM / 2;
const MIN_SCALE = 0.16;
const MAX_SCALE = 10;
const VISIBLE_RATIO = 0.6;
const WORKSPACE_HALF_PX = mmToPx(HALF_WORKSPACE_MM);

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

const getGridSnappedCentre = (obj: Object2D, center: PointMm): PointMm => {
  const bbox = getObjectBoundingBoxMm(obj);
  const topLeft = topLeftFromCenterMm(center, bbox);
  const snappedTopLeft = { xMm: snapMm(topLeft.xMm), yMm: snapMm(topLeft.yMm) };
  return centerFromTopLeftMm(snappedTopLeft, bbox);
};

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
export default function Canvas2D({
  activeTool,
  snapOn,
  objects,
  dimensions,
  selectedId,
  selectedMeasurementKey,
  onSelect,
  onSelectMeasurement,
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
  const [snapGuide, setSnapGuide] = useState<SnapGuideState>({ snappedPoint: null });
  const [spacePanning, setSpacePanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef<ScreenPoint | null>(null);

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
    if (!snapOn) return pointerMmClamped;
    return { xMm: snapMm(pointerMmClamped.xMm), yMm: snapMm(pointerMmClamped.yMm) };
  }, [pointerMmClamped, snapOn]);

  const snapMarkerPx = useMemo(() => {
    if (!desiredAnchorMm) return null;
    return { x: mmToPx(desiredAnchorMm.xMm), y: mmToPx(desiredAnchorMm.yMm) };
  }, [desiredAnchorMm]);

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
    const snappedTopLeft = snapOn ? { xMm: snapMm(anchor.xMm), yMm: snapMm(anchor.yMm) } : anchor;
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
    stopPanning();
  };

  const handleStageLeave = () => {
    stopPanning();
    setPointer(null);
    setHoverId(null);
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

  const handleObjectDragStart = () => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "grabbing";
    }
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
    if (!snapOn) {
      setSnapGuide({ snappedPoint: null });
      return proposedCentre;
    }

    const activeAabb = getAabbMm(obj, proposedCentre);
    const activePois = getPoisMm(activeAabb);
    const otherObjects = objects.filter((o) => o.id !== obj.id);

    const xCandidates: SnapAxisCandidate[] = [];
    const yCandidates: SnapAxisCandidate[] = [];

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

    const bestX = pickBestAxisCandidate(xCandidates);
    const bestY = pickBestAxisCandidate(yCandidates);

    const xSnappedToObject = Boolean(bestX);
    const ySnappedToObject = Boolean(bestY);

    const snappedAfterObject: PointMm = {
      xMm: proposedCentre.xMm + (bestX ? bestX.delta : 0),
      yMm: proposedCentre.yMm + (bestY ? bestY.delta : 0),
    };

    const snappedPoint = bestX?.type === "poi" ? bestX.targetPoint : bestY?.type === "poi" ? bestY.targetPoint : null;
    setSnapGuide({
      snappedX: xSnappedToObject ? bestX?.snapCoord : undefined,
      snappedY: ySnappedToObject ? bestY?.snapCoord : undefined,
      snappedPoint: snappedPoint ? { xMm: snappedPoint.x, yMm: snappedPoint.y } : null,
    });

    const bbox = getObjectBoundingBoxMm(obj);
    const snappedTopLeft = topLeftFromCenterMm(snappedAfterObject, bbox);
    const gridSnappedTopLeft = {
      xMm: xSnappedToObject ? snappedTopLeft.xMm : snapMm(snappedTopLeft.xMm),
      yMm: ySnappedToObject ? snappedTopLeft.yMm : snapMm(snappedTopLeft.yMm),
    };

    return centerFromTopLeftMm(gridSnappedTopLeft, bbox);
  };

  const handleObjectDragEnd = (evt: any, obj: Object2D) => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
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
        onDragStart: handleObjectDragStart,
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
      onDragStart: handleObjectDragStart,
      onDragEnd: (evt: any) => handleObjectDragEnd(evt, obj),
      ...hoverHandlers,
    };
    return <ShapeLanding2D {...landingProps} />;
  });

  const handleUpdateAnchor = useCallback(
    (id: string, key: MeasurementKey, offsetMm: number, commit?: boolean) => {
      const target = objects.find((candidate) => candidate.id === id);
      if (!target) return;
      const nextAnchors = {
        ...target.measurementAnchors,
        [key]: { ...target.measurementAnchors[key], offsetMm: Math.max(0, Math.round(offsetMm)) },
      };
      onUpdateObject(id, { measurementAnchors: nextAnchors }, commit);
    },
    [objects, onUpdateObject],
  );

  const handleUpdateLabel = useCallback(
    (id: string, key: MeasurementKey, position: { xMm: number; yMm: number }, commit?: boolean) => {
      const target = objects.find((candidate) => candidate.id === id);
      if (!target) return;
      const nextLabels = {
        ...target.measurementLabels,
        [key]: { xMm: Math.round(position.xMm), yMm: Math.round(position.yMm) },
      };
      onUpdateObject(id, { measurementLabels: nextLabels }, commit);
    },
    [objects, onUpdateObject],
  );

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
                <Grid2D cameraScale={camera.scale} workspaceSizeMm={WORKSPACE_SIZE_MM} />
              </Group>
            </Layer>

            <Layer>
              <Group {...worldGroupProps}>{objectNodes}</Group>
            </Layer>

            <Layer>
              <Group {...worldGroupProps} {...workspaceClip}>
                <Dimensions2D
                  objects={objects}
                  dimensions={dimensions}
                  cameraScale={camera.scale}
                  selectedId={selectedId}
                  selectedMeasurementKey={selectedMeasurementKey}
                  onSelect={onSelect}
                  onSelectMeasurement={onSelectMeasurement}
                  onUpdateAnchor={handleUpdateAnchor}
                  onUpdateLabel={handleUpdateLabel}
                />
              </Group>
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
                {snapMarkerPx && snapOn && <Circle x={snapMarkerPx.x} y={snapMarkerPx.y} radius={snapPointRadius} fill="#0ea5e9" opacity={0.85} />}
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
