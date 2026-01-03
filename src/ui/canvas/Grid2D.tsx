import { useMemo } from "react";
import { Group, Line, Rect } from "react-konva";
import { GRID_STEP_MM, mmToPx } from "../../model/units";

type Grid2DProps = {
  width: number;
  height: number;
};

const MINOR_SPACING_MM = GRID_STEP_MM;
const MAJOR_SPACING_MM = GRID_STEP_MM * 5;
const MINOR_SPACING = mmToPx(MINOR_SPACING_MM);
const MAJOR_SPACING = mmToPx(MAJOR_SPACING_MM);

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
          stroke={isMajor ? "rgba(148, 163, 184, 0.32)" : "rgba(148, 163, 184, 0.14)"}
          strokeWidth={isMajor ? 1 : 0.75}
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
          stroke={isMajor ? "rgba(148, 163, 184, 0.32)" : "rgba(148, 163, 184, 0.14)"}
          strokeWidth={isMajor ? 1 : 0.75}
          listening={false}
        />,
      );
      rowIndex += 1;
    }

    return nodes;
  }, [height, width]);

  return (
    <Group listening={false}>
      <Rect width={width} height={height} fill="#f8fbff" />
      {lines}
    </Group>
  );
}
