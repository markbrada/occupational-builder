import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { Object2D, PlatformObj, RampObj, Tool } from "../../model/types";
import { newPlatformAt, newRampAt } from "../../model/defaults";
import { centerFromTopLeftMm, getDefaultBoundingBoxMm, getObjectBoundingBoxMm, topLeftFromCenterMm } from "../../model/geometry";
import { mmToPx, pxToMm, snapMm } from "../../model/units";
import Grid2D from "./Grid2D";
import ShapePlatform2D from "./ShapePlatform2D";
import ShapeRamp2D from "./ShapeRamp2D";

type CanvasSize = {
  width: number;
  height: number;
};

type Canvas2DProps = {
  activeTool: Tool;
  snapOn: boolean;
  objects: Object2D[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onPlaceAt: (tool: Tool, xMm: number, yMm: number) => void;
  onUpdateObject: (id: string, updater: (obj: Object2D) => Object2D) => void;
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

const SNAP_THRESHOLD_MM = 20;

const getAabbMm = (obj: Object2D, centerOverride?: PointMm): AabbMm => {
  const size = getObjectBoundingBoxMm(obj);
  const cx = centerOverride?.xMm ?? obj.xMm;
  const cy = centerOverride?.yMm ?? obj.yMm;
  const left = cx - size.widthMm / 2;
  const top = cy - size.heightMm / 2;
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

export default function Canvas2D({
  activeTool,
  snapOn,
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
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [pointer, setPointer] = useState<PointerState>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [snapGuide, setSnapGuide] = useState<SnapGuideState>({ snappedPoint: null });

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

  const pointerMm: PointMm | null = useMemo(() => {
    if (!pointer) return null;
    return { xMm: pxToMm(pointer.x), yMm: pxToMm(pointer.y) };
  }, [pointer]);

  const desiredAnchorMm: PointMm | null = useMemo(() => {
    if (!pointerMm) return null;
    if (!snapOn) return pointerMm;
    return { xMm: snapMm(pointerMm.xMm), yMm: snapMm(pointerMm.yMm) };
  }, [pointerMm, snapOn]);

  const snapMarkerPx = useMemo(() => {
    if (!desiredAnchorMm) return null;
    return { x: mmToPx(desiredAnchorMm.xMm), y: mmToPx(desiredAnchorMm.yMm) };
  }, [desiredAnchorMm]);

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

  const ghostPlatform: PlatformObj | null = useMemo(() => {
    if (!desiredAnchorMm || activeTool !== "platform") return null;
    const centre = getPlacementCentreFromAnchor("platform", desiredAnchorMm);
    if (!centre) return null;
    return {
      ...newPlatformAt(centre.xMm, centre.yMm),
      id: "ghost-platform",
      locked: true,
    };
  }, [activeTool, desiredAnchorMm]);

  const handleStagePointerMove = () => {
    if (!stageRef.current) return;
    const pos = stageRef.current.getPointerPosition();
    if (pos) {
      setPointer({ x: pos.x, y: pos.y });
    }
  };

  const handleStageLeave = () => {
    setPointer(null);
    setHoverId(null);
  };

  const handleStageMouseDown = (evt: any) => {
    if (!stageRef.current) return;
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;

    const isStageClick = evt.target === stageRef.current || evt.target === stageRef.current.getStage();

    if ((activeTool === "ramp" || activeTool === "platform") && isStageClick) {
      const anchor: PointMm = { xMm: pxToMm(pos.x), yMm: pxToMm(pos.y) };
      const centre = getPlacementCentreFromAnchor(activeTool, anchor);
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

  const handleContextMenu = (evt: any) => {
    evt.evt.preventDefault();
    onSetActiveTool("none");
  };

  const handleObjectPointerDown = (evt: any, obj: Object2D) => {
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

  const getObjectSnap = (obj: Object2D, proposedPx: { x: number; y: number }) => {
    const proposedCentre: PointMm = { xMm: pxToMm(proposedPx.x), yMm: pxToMm(proposedPx.y) };
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
    const xPx = evt.target.x();
    const yPx = evt.target.y();
    const snappedCentre = getObjectSnap(obj, { x: xPx, y: yPx });
    const snappedPx = { x: mmToPx(snappedCentre.xMm), y: mmToPx(snappedCentre.yMm) };
    evt.target.position(snappedPx);
    const xMm = snappedCentre.xMm;
    const yMm = snappedCentre.yMm;
    onUpdateObject(obj.id, (current) => ({ ...current, xMm, yMm }));
    setSnapGuide({ snappedPoint: null });
  };

  const hudLabel = useMemo(() => {
    if (!pointer || (activeTool !== "ramp" && activeTool !== "platform")) return null;
    const label = activeTool === "ramp" ? "Click to place Ramp (Esc to cancel)" : "Click to place Platform (Esc to cancel)";
    return { text: label, x: pointer.x + 10, y: pointer.y + 12 };
  }, [activeTool, pointer]);

  const objectNodes = objects.map((obj) => {
    const isSelected = obj.id === selectedId;
    const isHover = obj.id === hoverId;
    const draggable = isSelected && !obj.locked;
    const dragBoundFunc = (pos: any) => {
      const snappedCentre = getObjectSnap(obj, pos);
      return { x: mmToPx(snappedCentre.xMm), y: mmToPx(snappedCentre.yMm) };
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
    const platformProps = {
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
    return <ShapePlatform2D {...platformProps} />;
  });

  return (
    <div className="ob-canvasHost" ref={containerRef} data-tool={activeTool}>
      {hasSize ? (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseMove={handleStagePointerMove}
          onTouchMove={handleStagePointerMove}
          onMouseLeave={handleStageLeave}
          onTouchEnd={handleStageLeave}
          onContextMenu={handleContextMenu}
          onMouseDown={handleStageMouseDown}
        >
          <Layer listening={false}>
            <Grid2D width={size.width} height={size.height} />
          </Layer>

          <Layer>{objectNodes}</Layer>

          <Layer listening={false}>
            {snapGuide.snappedX !== undefined && (
              <Line
                points={[mmToPx(snapGuide.snappedX), 0, mmToPx(snapGuide.snappedX), size.height]}
                stroke="rgba(239,68,68,0.5)"
                strokeWidth={1}
              />
            )}
            {snapGuide.snappedY !== undefined && (
              <Line
                points={[0, mmToPx(snapGuide.snappedY), size.width, mmToPx(snapGuide.snappedY)]}
                stroke="rgba(239,68,68,0.5)"
                strokeWidth={1}
              />
            )}
            {snapGuide.snappedPoint && (
              <Circle x={mmToPx(snapGuide.snappedPoint.xMm)} y={mmToPx(snapGuide.snappedPoint.yMm)} radius={4} fill="rgba(239,68,68,0.5)" />
            )}
          </Layer>

          <Layer listening={false}>
            {pointer && (
              <>
                <Line points={[pointer.x, 0, pointer.x, size.height]} stroke="#cbd5e1" dash={[4, 4]} />
                <Line points={[0, pointer.y, size.width, pointer.y]} stroke="#cbd5e1" dash={[4, 4]} />
              </>
            )}
            {snapMarkerPx && snapOn && <Circle x={snapMarkerPx.x} y={snapMarkerPx.y} radius={4} fill="#0ea5e9" opacity={0.8} />}
            {ghostRamp && (
              <ShapeRamp2D obj={ghostRamp} selected={false} hover={false} activeTool={activeTool} draggable={false} ghost />
            )}
            {ghostPlatform && (
              <ShapePlatform2D obj={ghostPlatform} selected={false} hover={false} activeTool={activeTool} draggable={false} ghost />
            )}
            {hudLabel && (
              <Group x={hudLabel.x} y={hudLabel.y}>
                <Rect width={220} height={26} fill="rgba(17,24,39,0.8)" cornerRadius={6} />
                <Text text={hudLabel.text} x={8} y={6} fontSize={12} fill="#e5e7eb" />
              </Group>
            )}
          </Layer>
        </Stage>
      ) : (
        <div className="canvas-placeholder">2D Canvas loading...</div>
      )}
    </div>
  );
}
