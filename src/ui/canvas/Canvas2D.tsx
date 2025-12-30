import { useEffect, useRef, useState } from "react";
import { Layer, Stage, Text } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Grid2D from "./Grid2D";
import ShapeRamp2D from "./ShapeRamp2D";
import ShapePlatform2D from "./ShapePlatform2D";
import { CanvasObject2D, PX_PER_MM, SNAP_MM, Tool } from "../../model/types";

type CanvasSize = {
  width: number;
  height: number;
};

type Canvas2DProps = {
  activeTool: Tool;
  snapOn: boolean;
  objects: CanvasObject2D[];
  selectedId: string | null;
  onPlaceObject: (tool: Tool, position: { xMm: number; yMm: number }) => void;
  onSelectObject: (id: string | null) => void;
  onDeleteObject: (id: string) => void;
  onMoveObject: (id: string, position: { xMm: number; yMm: number }) => void;
};

const mmToPx = (value: number) => value * PX_PER_MM;
const pxToMm = (value: number) => value / PX_PER_MM;

const snapValue = (valueMm: number) => Math.round(valueMm / SNAP_MM) * SNAP_MM;

export default function Canvas2D({
  activeTool,
  snapOn,
  objects,
  selectedId,
  onPlaceObject,
  onSelectObject,
  onDeleteObject,
  onMoveObject,
}: Canvas2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

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

  const handleStagePointerDown = (
    event: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>,
  ) => {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) {
      return;
    }

    const isStageTarget = event.target === stage;

    if (activeTool === "ramp" || activeTool === "platform") {
      if (!isStageTarget) {
        return;
      }

      const xMm = pxToMm(pointer.x);
      const yMm = pxToMm(pointer.y);
      const snappedX = snapOn ? snapValue(xMm) : xMm;
      const snappedY = snapOn ? snapValue(yMm) : yMm;

      onPlaceObject(activeTool, { xMm: snappedX, yMm: snappedY });
      return;
    }

    if (activeTool === "select" && isStageTarget) {
      onSelectObject(null);
    }
  };

  return (
    <div className="ob-canvasHost" ref={containerRef}>
      {hasSize ? (
        <Stage
          width={size.width}
          height={size.height}
          onMouseDown={handleStagePointerDown}
          onTouchStart={handleStagePointerDown}
        >
          <Layer listening={false}>
            <Text text="2D Canvas" x={10} y={10} fill="#111827" fontSize={14} />
            <Grid2D width={size.width} height={size.height} />
          </Layer>
          <Layer>
            {objects.map((object) => {
              const positionPx = { x: mmToPx(object.xMm), y: mmToPx(object.yMm) };
              const isSelected = object.id === selectedId;

              if (object.type === "ramp") {
                return (
                  <ShapeRamp2D
                    key={object.id}
                    ramp={object}
                    positionPx={positionPx}
                    pxPerMm={PX_PER_MM}
                    activeTool={activeTool}
                    snapOn={snapOn}
                    isSelected={isSelected}
                    onSelect={() => onSelectObject(object.id)}
                    onDelete={() => onDeleteObject(object.id)}
                    onMove={(positionMm) => onMoveObject(object.id, positionMm)}
                  />
                );
              }

              return (
                <ShapePlatform2D
                  key={object.id}
                  platform={object}
                  positionPx={positionPx}
                  pxPerMm={PX_PER_MM}
                  activeTool={activeTool}
                  snapOn={snapOn}
                  isSelected={isSelected}
                  onSelect={() => onSelectObject(object.id)}
                  onDelete={() => onDeleteObject(object.id)}
                  onMove={(positionMm) => onMoveObject(object.id, positionMm)}
                />
              );
            })}
          </Layer>
        </Stage>
      ) : (
        <div className="canvas-placeholder">2D Canvas loading...</div>
      )}
    </div>
  );
}
