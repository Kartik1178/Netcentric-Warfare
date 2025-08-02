import { useEffect, useRef } from "react";
import { Group, Arc } from "react-konva";

export default function RadarSweep({ radius = 200, speed = 2, color = "lime", opacity = 0.15, zoom = 1 }) {
  const sweepRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const anim = requestAnimationFrame(function rotate() {
      if (sweepRef.current) {
        angleRef.current = (angleRef.current + speed) % 360;
        sweepRef.current.rotation(angleRef.current);
      }
      requestAnimationFrame(rotate);
    });
    return () => cancelAnimationFrame(anim);
  }, [speed]);

  return (
    <Group scaleX={zoom} scaleY={zoom}>
      {/* Radar Arc */}
      <Arc
        ref={sweepRef}
        innerRadius={0}
        outerRadius={radius}
        angle={60} // 60° sweep
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: radius, y: 0 }}
        fillLinearGradientColorStops={[0, color, 1, "transparent"]}
        opacity={opacity}
      />
      {/* Outer Glow */}
      <Arc
        innerRadius={radius - 5}
        outerRadius={radius}
        angle={360}
        fill={color}
        opacity={opacity / 2}
      />
    </Group>
  );
}
