import React from 'react';
import { Group, Circle, Image, Line } from 'react-konva';
import useImage from 'use-image';

export const Interceptor = ({
  x, // Current X position (updated by TerritoryMap)
  y, // Current Y position (updated by TerritoryMap)
  radius = 10,
  // heading, // Heading is not directly used for rendering a simple circle/image
  // collisionRadius // Not directly used for rendering the interceptor itself
}) => {
  const [image] = useImage("/interceptor.png"); // Assuming you have an interceptor.png image

  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill="cyan" // Interceptor color
        shadowBlur={4}
        shadowColor="cyan"
        stroke="white"
        strokeWidth={1}
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
      {/* Removed heading line and collisionRadius circle from Interceptor component
          as they are typically for debugging or handled elsewhere.
          You can re-add them if you have a specific visual need.
      */}
    </Group>
  );
};
