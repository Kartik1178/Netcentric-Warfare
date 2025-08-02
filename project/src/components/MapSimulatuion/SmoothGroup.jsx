import { useEffect, useRef } from "react";
import { Group } from "react-konva";
import Konva from "konva";

export default function SmoothGroup({
  x,
  y,
  scale = 1,
  opacity = 1,
  children,
  onClick,
  cursor = "pointer",
}) {
  const groupRef = useRef(null);

  // Smoothly animate when position/scale/opacity changes
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.to({
      x,
      y,
      scaleX: scale,
      scaleY: scale,
      opacity,
      duration: 0.3,
      easing: Konva.Easings.EaseInOut,
    });
  }, [x, y, scale, opacity]);

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      opacity={opacity}
      listening={true}
      onClick={onClick}
      onMouseEnter={(e) => (e.target.getStage().container().style.cursor = cursor)}
      onMouseLeave={(e) => (e.target.getStage().container().style.cursor = "default")}
    >
      {children}
    </Group>
  );
}
