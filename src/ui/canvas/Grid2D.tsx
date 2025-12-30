import { useMemo } from "react";
import { Group, Line } from "react-konva";

type Grid2DProps = {
  width: number;
  height: number;
};

const MINOR_SPACING = 10;
const MAJOR_SPACING = 50;

export default function Grid2D({ width, height }: Grid2DProps) {
  const lines = useMemo(() => {
    const nodes: JSX.Element[] = [];

    let columnIndex = 0;
    for (let x = 0; x <= width; x += MINOR_SPACING) {
      const isMajor = x % MAJOR_SPACING === 0;
      nodes.push(
        <Line
          key={`v-${columnIndex}`}
          points={[x, 0, x, height]}
          stroke={isMajor ? "rgba(148, 163, 184, 0.85)" : "rgba(203, 213, 225, 0.65)"}
          strokeWidth={isMajor ? 1.25 : 1}
          listening={false}
        />,
      );
      columnIndex += 1;
    }

    let rowIndex = 0;
    for (let y = 0; y <= height; y += MINOR_SPACING) {
      const isMajor = y % MAJOR_SPACING === 0;
      nodes.push(
        <Line
          key={`h-${rowIndex}`}
          points={[0, y, width, y]}
          stroke={isMajor ? "rgba(148, 163, 184, 0.85)" : "rgba(203, 213, 225, 0.65)"}
          strokeWidth={isMajor ? 1.25 : 1}
          listening={false}
        />,
      );
      rowIndex += 1;
    }

    return nodes;
  }, [height, width]);

  return <Group listening={false}>{lines}</Group>;
}
