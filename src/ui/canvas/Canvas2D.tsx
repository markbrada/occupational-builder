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

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize((current) => {
        if (current.width === rect.width && current.height === rect.height) {
          return current;
        }

        return {
          width: rect.width,
          height: rect.height,
        };
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const hasSize = size.width > 0 && size.height > 0;

  return (
    <div className="canvas-viewport ob-canvasHost" ref={containerRef}>
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
