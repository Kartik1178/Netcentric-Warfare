// BaseGridBackground.jsx
import React from "react";
import { Group, Rect } from "react-konva";

export default function BaseGridBackground({ width, height, cellSize = 30 }) {
  const rows = Math.ceil(height / cellSize);
  const cols = Math.ceil(width / cellSize);

  const cells = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cells.push(
        <Rect
          key={`${i}-${j}`}
          x={j * cellSize}
          y={i * cellSize}
          width={cellSize}
          height={cellSize}
          stroke="#444"
          strokeWidth={0.5}
        />
      );
    }
  }

  return <Group>{cells}</Group>;
}
