import React from "react";
import { Group, Circle, Image, Text } from "react-konva";
import useImage from "use-image";
import { useJammerEffect } from "./JammerEffect";

export function DroneUnit({ id, x, y, radius = 10, effectRadius = 150, frequency = "2GHz" }) {
  const [image] = useImage("/zap.png");

  // Broadcast jamming effect at current x/y
  useJammerEffect({
    id,
    x,
    y,
    radius,
    effectRadius,
    frequency,
    interval: 200,
  });

  return (
    <Group x={x} y={y}>
      <Circle radius={radius} fill="red" shadowBlur={4} shadowColor="black" />
      <Circle
        radius={effectRadius}
        stroke="rgba(255, 0, 0, 0.4)"
        strokeWidth={2}
        dash={[10, 5]}
      />
      {image && (
        <Image
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
        />
      )}
      <Text
        x={-radius}
        y={-radius - 12}
        text={`DRONE\n${id.split("-")[1]}`}
        fontSize={12}
        fill="yellow"
        align="center"
      />
    </Group>
  );
}
