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

  const getSnappedPositionPx = (obj: Object2D, proposedPx: { x: number; y: number }) => {
    if (!snapOn) return proposedPx;

    const centreMm = { xMm: pxToMm(proposedPx.x), yMm: pxToMm(proposedPx.y) };
    const bbox = getObjectBoundingBoxMm(obj);
    const topLeft = topLeftFromCenterMm(centreMm, bbox);
    const snappedTopLeft = { xMm: snapMm(topLeft.xMm), yMm: snapMm(topLeft.yMm) };
    const snappedCentre = centerFromTopLeftMm(snappedTopLeft, bbox);
    return { x: mmToPx(snappedCentre.xMm), y: mmToPx(snappedCentre.yMm) };
  };

  const handleObjectDragEnd = (evt: any, obj: Object2D) => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
    const xPx = evt.target.x();
    const yPx = evt.target.y();
    const snapped = getSnappedPositionPx(obj, { x: xPx, y: yPx });
    evt.target.position(snapped);
    const xMm = pxToMm(snapped.x);
    const yMm = pxToMm(snapped.y);
    onUpdateObject(obj.id, (current) => ({ ...current, xMm, yMm }));
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
    const dragBoundFunc = (pos: any) => getSnappedPositionPx(obj, pos);
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
