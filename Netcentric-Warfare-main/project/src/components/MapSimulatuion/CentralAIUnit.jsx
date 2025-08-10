import React from "react";
import { Group, Circle, Text } from "react-konva";
import { CENTRAL_AI_POSITION } from "../../constants/AIconstant";

export default function CentralAIUnit({ id, label = "C2 AI", x, y }) {
  // ⚡️ CRITICAL FIX: Validate ALL props before attempting to render.
  const isCoordinatesValid = typeof x === 'number' && isFinite(x) && typeof y === 'number' && isFinite(y);
  const isLabelValid = label && String(label).trim() !== '';

  if (!isCoordinatesValid || !isLabelValid) {
    console.warn(`[CentralAIUnit ${id}] Critical rendering data is missing or invalid (x, y, or label). Skipping render.`);
    return null; // Don't render the component at all if props are bad.
  }

  const displayText = String(label).trim();

  return (
    <Group x={x} y={y}>
      <Circle
        radius={30}
        fill="#8A2BE2"
        stroke="#FFFFFF"
        strokeWidth={2}
        shadowColor="#8A2BE2"
        shadowBlur={20}
        shadowOpacity={0.8}
        listening={false}
      />
      <Text
        text={displayText}
        fontSize={14}
        fill="#FFFFFF"
        fontFamily="Inter, sans-serif"
        align="center"
        verticalAlign="middle"
        x={-30}
        y={-7}
        width={60}
        height={14}
        listening={false}
      />
    </Group>
  );
}