import { useEffect, useRef, useState } from "react";
import { Layer, Stage, Text } from "react-konva";
import Grid2D from "./Grid2D";

type CanvasSize = {
  width: number;
  height: number;
};

export default function Canvas2D() {
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

  return (
    <div className="ob-canvasHost" ref={containerRef}>
      {hasSize ? (
        <Stage width={size.width} height={size.height} listening={false}>
          <Layer listening={false}>
            <Text text="2D Canvas" x={10} y={10} fill="#111827" fontSize={14} />
            <Grid2D width={size.width} height={size.height} />
          </Layer>
        </Stage>
      ) : (
        <div className="canvas-placeholder">2D Canvas loading...</div>
      )}
    </div>
  );
}
