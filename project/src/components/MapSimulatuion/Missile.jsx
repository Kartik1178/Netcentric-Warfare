import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle, Line } from "react-konva";
import useImage from "use-image";

export default function Missile({ x, y, radius = 20 }) {
  const [image] = useImage("/missile.png");
  const [trail, setTrail] = useState([]);
  const trailRef = useRef([]);

  useEffect(() => {
    trailRef.current = [...trailRef.current, { x, y }];

    if (trailRef.current.length > 15) {
      trailRef.current.shift(); // Limit trail size
    }

    setTrail([...trailRef.current]);
  }, [x, y]);

  return (
    <Group x={x} y={y}>
      {/* Trail */}
      <Line
        points={trail.flatMap((p) => [p.x - x, p.y - y])}
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
        tension={0.2}
      />

      {/* Missile body */}
      <Circle
        radius={radius}
        fill="blue"
        stroke="black"
        strokeWidth={2}
        shadowBlur={4}
        shadowColor="black"
      />

      {/* Missile image clipped in a circle */}
      {image && (
        <Image
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
            ctx.closePath();
          }}
        />
      )}
    </Group>
  );
}
