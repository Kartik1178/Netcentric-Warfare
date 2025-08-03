import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle, Line } from "react-konva";
import useImage from "use-image";

export default function Missile({ x, y, radius = 20 }) {
  const [image] = useImage("/missile.png");
  const [trail, setTrail] = useState([]);
  const trailRef = useRef([]);

  // ✅ Log coordinates for debugging
  useEffect(() => {
    console.log("🚀 Missile rendered at:", x, y);
  }, [x, y]);

  // ✅ Update trail history
  useEffect(() => {
    trailRef.current = [...trailRef.current, { x, y }];
    if (trailRef.current.length > 15) {
      trailRef.current.shift();
    }
    setTrail([...trailRef.current]);
  }, [x, y]);

  // ✅ Convert trail to points relative to the stage
  const trailPoints = trail.flatMap((p) => [p.x, p.y]);

  return (
    <Group>
      {/* 🔹 Trail (absolute coordinates, no offset) */}
      {trailPoints.length > 2 && (
        <Line
          points={trailPoints}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
          tension={0.2}
        />
      )}

      {/* 🔹 Missile Body */}
      <Group x={x} y={y}>
        <Circle
          x={0}
          y={0}
          radius={radius}
          fill="red"
          stroke="black"
          strokeWidth={2}
          shadowBlur={4}
          shadowColor="black"
        />

        {/* 🔹 Optional Missile Image */}
        {image && (
          <Image
            image={image}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            opacity={0.8}
          />
        )}
      </Group>
    </Group>
  );
}
