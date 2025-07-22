import React from 'react';
import { Group, Circle, Image, Line } from 'react-konva';
import useImage from 'use-image';

export const Interceptor = ({
  x,
  y,
  radius = 10,
  heading,
  collisionRadius
}) => {
  const [image] = useImage("/missile.png");

  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill="green"
        shadowBlur={4}
        shadowColor="black"
      />
      {image && (
        <Image
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.closePath();
          }}
        />
      )}
      {/* Optional: Draw heading line for debug */}
      <Line
        points={[0, 0, Math.cos(heading) * 20, Math.sin(heading) * 20]}
        stroke="yellow"
        strokeWidth={2}
      />
      <Circle
        radius={collisionRadius}
        stroke="cyan"
        strokeWidth={1}
        dash={[4, 4]}
        opacity={0.4}
      />
    </Group>
  );
};
