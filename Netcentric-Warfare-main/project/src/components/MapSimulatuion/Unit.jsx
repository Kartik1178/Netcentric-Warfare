import React, { useEffect, useRef } from "react";
import { Image as KonvaImage, Group, Text } from "react-konva";
import useImage from "use-image";

// Generic Unit component
const Unit = ({ x, y, name, type, imageSrc, onClick }) => {
  const [img] = useImage(imageSrc);
  return (
    <Group x={x} y={y} onClick={onClick} offsetX={25} offsetY={25}>
      <KonvaImage image={img} width={50} height={50} />
      <Text
        text={name}
        fontSize={12}
        fill="white"
        y={30}
        offsetX={25}
        align="center"
      />
    </Group>
  );
};

// Drone Unit
export const DroneUnit = ({ x, y, name, onClick }) => {
  return <Unit x={x} y={y} name={name} type="drone" imageSrc="/images/drone.png" onClick={onClick} />;
};

// Artillery Unit
export const ArtilleryUnit = ({ x, y, name, onClick }) => {
  return <Unit x={x} y={y} name={name} type="artillery" imageSrc="/images/artillery.png" onClick={onClick} />;
};
