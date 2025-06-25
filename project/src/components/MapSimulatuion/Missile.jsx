import React from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";

export default function Missile({ x, y, radius = 20 }) {
  const [image] = useImage("/missile.png");

  return (
    <Group x={x} y={y}>
      {/* Circular background */}
      <Circle
        radius={radius}
        fill="red" // Dodger blue for better contrast
        shadowBlur={4}
        shadowColor="black"
      />
      {/* Missile Image masked to fit circle dimensions */}
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
