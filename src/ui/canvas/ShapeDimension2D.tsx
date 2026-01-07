import { Group } from "react-konva";
import { DimensionObj, SnapIncrementMm, Tool } from "../../model/types";
import { mmToPx } from "../../model/units";
import DimensionAnnotation from "./DimensionAnnotation";

type Props = {
  obj: DimensionObj;
  selected: boolean;
  hover: boolean;
  activeTool: Tool;
  snapIncrementMm: SnapIncrementMm;
  draggable: boolean;
  dragBoundFunc?: (pos: any) => any;
  ghost?: boolean;
  onPointerDown?: (evt: any) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (evt: any) => void;
};

const normalize = (value: { xMm: number; yMm: number }) => {
  const length = Math.hypot(value.xMm, value.yMm);
  if (length === 0) return { xMm: 0, yMm: -1 };
  return { xMm: value.xMm / length, yMm: value.yMm / length };
};

export default function ShapeDimension2D({
  obj,
  selected,
  hover,
  activeTool,
  snapIncrementMm,
  draggable,
  dragBoundFunc,
  ghost = false,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
}: Props) {
  const direction = normalize({ xMm: obj.endMm.xMm - obj.startMm.xMm, yMm: obj.endMm.yMm - obj.startMm.yMm });
  const normal = { xMm: -direction.yMm, yMm: direction.xMm };
  const lengthMm = Math.hypot(obj.endMm.xMm - obj.startMm.xMm, obj.endMm.yMm - obj.startMm.yMm);
  const label = `${Math.round(lengthMm)}mm`;

  return (
    <Group
      x={mmToPx(obj.xMm)}
      y={mmToPx(obj.yMm)}
      draggable={draggable && !ghost}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      dragBoundFunc={dragBoundFunc}
      rotation={obj.rotationDeg}
      listening={!ghost}
      opacity={ghost ? 0.6 : 1}
    >
      <DimensionAnnotation
        startMm={obj.startMm}
        endMm={obj.endMm}
        normalMm={normal}
        offsetMm={obj.offsetMm}
        label={label}
        rotationDeg={obj.rotationDeg}
        snapIncrementMm={snapIncrementMm}
      />
    </Group>
  );
}
