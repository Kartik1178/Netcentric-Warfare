import React, { useEffect, useRef, useState } from "react";
import { Group, Circle, Rect, Text, Image, Line } from "react-konva";
import useImage from "use-image";

// ===================== DRONE =====================
export const DroneUnit = ({ x, y, radius = 20 }) => {
  const [droneImg] = useImage("/drone.png"); // <-- Place your drone image in public/drone.png
  const [trail, setTrail] = useState([]);
  const trailRef = useRef([]);

  // Update movement trail for drone
  useEffect(() => {
    trailRef.current = [...trailRef.current, { x, y }];
    if (trailRef.current.length > 10) trailRef.current.shift();
    setTrail([...trailRef.current]);
  }, [x, y]);

  const trailPoints = trail.flatMap((p) => [p.x, p.y]);

  return (
    <Group>
      {/* Flight trail */}
      {trailPoints.length > 2 && (
        <Line
          points={trailPoints}
          stroke="rgba(0,255,255,0.5)"
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
          tension={0.2}
        />
      )}

      {/* Drone body */}
      <Group x={x} y={y}>
        {/* Fallback shape while image loads */}
        <Circle
          radius={radius}
          fill="cyan"
          opacity={0.6}
          shadowBlur={4}
        />
        {droneImg && (
          <Image
            image={droneImg}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            opacity={0.9}
          />
        )}
      </Group>
    </Group>
  );
};

// ===================== ARTILLERY =====================
export const ArtilleryUnit = ({ x, y, radius = 20, onClick }) => {
  const [artilleryImg] = useImage("/artillery.png"); // <-- Place your artillery image in public/artillery.png

  return (
    <Group x={x} y={y} onClick={onClick}>
      {/* Fallback shape while image loads */}
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

      {/* Artillery image */}
      {artilleryImg && (
        <Image
          image={artilleryImg}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          opacity={0.9}
        />
      )}
    </Group>
  );
};
