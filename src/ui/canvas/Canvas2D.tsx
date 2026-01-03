import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import { Object2D, PlatformObj, RampObj, Tool } from "../../model/types";
import { newPlatformAt, newRampAt } from "../../model/defaults";
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
  const selectedNodeRef = useRef<KonvaGroup | null>(null);
  const transformerRef = useRef<KonvaTransformer | null>(null);
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

  const selectedObj = useMemo(() => objects.find((obj) => obj.id === selectedId) ?? null, [objects, selectedId]);
  const minSizePx = useMemo(() => mmToPx(200), []);

  useEffect(() => {
    const transformer = transformerRef.current;
    const node = selectedNodeRef.current;
    if (!transformer) return;

    if (node && selectedObj && !selectedObj.locked) {
      transformer.nodes([node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedObj]);

  const pointerMm = useMemo(() => {
    if (!pointer) return null;
    return { x: pxToMm(pointer.x), y: pxToMm(pointer.y) };
  }, [pointer]);

  const snappedPointerMm = useMemo(() => {
    if (!pointerMm) return null;
    if (!snapOn) return pointerMm;
    return { x: snapMm(pointerMm.x), y: snapMm(pointerMm.y) };
  }, [pointerMm, snapOn]);

  const snapMarkerPx = useMemo(() => {
    if (!snappedPointerMm) return null;
    return { x: mmToPx(snappedPointerMm.x), y: mmToPx(snappedPointerMm.y) };
  }, [snappedPointerMm]);

  const ghostRamp: RampObj | null = useMemo(() => {
    if (!snappedPointerMm || activeTool !== "ramp") return null;
    return {
      ...newRampAt(snappedPointerMm.x, snappedPointerMm.y),
      id: "ghost-ramp",
      locked: true,
    };
  }, [activeTool, snappedPointerMm]);

  const ghostPlatform: PlatformObj | null = useMemo(() => {
    if (!snappedPointerMm || activeTool !== "platform") return null;
    return {
      ...newPlatformAt(snappedPointerMm.x, snappedPointerMm.y),
      id: "ghost-platform",
      locked: true,
    };
  }, [activeTool, snappedPointerMm]);

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
      const xMm = snapOn ? snapMm(pxToMm(pos.x)) : pxToMm(pos.x);
      const yMm = snapOn ? snapMm(pxToMm(pos.y)) : pxToMm(pos.y);
      onPlaceAt(activeTool, xMm, yMm);
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

  const handleObjectDragEnd = (evt: any, obj: Object2D) => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = "";
    }
    const xPx = evt.target.x();
    const yPx = evt.target.y();
    const xMm = snapOn ? snapMm(pxToMm(xPx)) : pxToMm(xPx);
    const yMm = snapOn ? snapMm(pxToMm(yPx)) : pxToMm(yPx);
    evt.target.position({ x: mmToPx(xMm), y: mmToPx(yMm) });
    onUpdateObject(obj.id, (current) => ({ ...current, xMm, yMm }));
  };

  const handleObjectTransformEnd = (evt: any, obj: Object2D) => {
    const node = evt.target;
    const newWidthPx = node.width() * node.scaleX();
    const newHeightPx = node.height() * node.scaleY();

    const newWidthMmRaw = pxToMm(newWidthPx);
    const newHeightMmRaw = pxToMm(newHeightPx);
    const newWidthMm = snapOn ? snapMm(newWidthMmRaw) : newWidthMmRaw;
    const newHeightMm = snapOn ? snapMm(newHeightMmRaw) : newHeightMmRaw;

    const snappedWidthPx = mmToPx(newWidthMm);
    const snappedHeightPx = mmToPx(newHeightMm);

    node.width(snappedWidthPx);
    node.height(snappedHeightPx);
    node.scaleX(1);
    node.scaleY(1);

    if (obj.kind === "ramp") {
      onUpdateObject(obj.id, (current) => ({ ...current, runMm: newWidthMm, widthMm: newHeightMm }));
      return;
    }
    onUpdateObject(obj.id, (current) => ({ ...current, lengthMm: newWidthMm, widthMm: newHeightMm }));
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
        onPointerDown: (evt: any) => handleObjectPointerDown(evt, obj),
        onDragStart: handleObjectDragStart,
        onDragEnd: (evt: any) => handleObjectDragEnd(evt, obj),
        onTransformEnd: (evt: any) => handleObjectTransformEnd(evt, obj),
        ...hoverHandlers,
      };
      return <ShapeRamp2D {...rampProps} ref={isSelected ? selectedNodeRef : undefined} />;
    }
    const platformProps = {
      key: obj.id,
      obj,
      selected: isSelected,
      hover: isHover,
      activeTool,
      draggable,
      onPointerDown: (evt: any) => handleObjectPointerDown(evt, obj),
      onDragStart: handleObjectDragStart,
      onDragEnd: (evt: any) => handleObjectDragEnd(evt, obj),
      onTransformEnd: (evt: any) => handleObjectTransformEnd(evt, obj),
      ...hoverHandlers,
    };
    return <ShapePlatform2D {...platformProps} ref={isSelected ? selectedNodeRef : undefined} />;
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

          <Layer>
            {objectNodes}
            {selectedId && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                enabledAnchors={selectedObj && !selectedObj.locked ? ["top-left", "top-right", "bottom-left", "bottom-right"] : []}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < minSizePx || newBox.height < minSizePx) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
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
