import React, { useEffect, useRef } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";

import socket from "../socket";
export default function Radar({ x, y, radius = 20, objects }) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set()); 

  useEffect(() => {
    const detectionRadius = 150;

    const detectMissiles = () => {
      const threats = objects.filter((obj) => {
        if (obj.type !== "missile") return false;

        const dx = obj.x - x;
        const dy = obj.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= detectionRadius;
      });

      threats.forEach((missile) => {
        if (!detectedMissiles.current.has(missile.id)) {
          console.log(" Radar detected missile:", missile);
          socket.emit("unit-signal", {
            source: "radar",
            type: "relay-to-antenna",
            payload: {
              id: missile.id,
              x: missile.x,
              y: missile.y,
            },
          });
          detectedMissiles.current.add(missile.id); // ✅ avoid re-detecting same missile
        }
      });
    };

    const interval = setInterval(detectMissiles, 1000); // check every second
    return () => clearInterval(interval);
  }, [x, y, objects]);

  return (
    <Group x={x} y={y}>
      <Circle radius={radius} fill="green" shadowBlur={4} shadowColor="black" />
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
