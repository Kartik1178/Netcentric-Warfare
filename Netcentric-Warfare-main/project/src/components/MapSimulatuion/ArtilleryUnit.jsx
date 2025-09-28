import React from "react";
import { Group, Rect, Image } from "react-konva";
import useImage from "use-image";

export const ArtilleryUnit = ({ x, y, radius = 20, onClick }) => {
  const [artilleryImg] = useImage("/artillery.png");

  return (
    <Group x={x} y={y} onClick={onClick}>
      <Rect
        x={-radius / 2}
        y={-radius / 2}
        width={radius}
        height={radius}
        fill="orange"
        stroke="black"
        strokeWidth={2}
        cornerRadius={4}
        opacity={0.6}
      />
      {artilleryImg && (
        <Image
          image={artilleryImg}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
        />
      )}
    </Group>
  );
};
