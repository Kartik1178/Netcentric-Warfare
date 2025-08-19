import React, { useEffect, useRef } from "react";
import { Group, Circle, Text, Image } from "react-konva";
import useImage from "use-image";
import socket from "../socket";

// Global set to track missiles already logged in the simulation
const loggedMissiles = new Set();

export default function Radar({
  id,
  baseId,
  x,
  y,
  objects = [],
  zoom = 7,
  absoluteX,
  absoluteY,
  currentFrequency,
  onLogsUpdate,
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set());
  const baseRadius = 150;

  const objectsRef = useRef(objects);
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    const detectMissiles = () => {
      const detectionRadiusPx = baseRadius * (zoom / 7);

      objectsRef.current.forEach((missile) => {
        if (missile.type !== "missile" || missile.exploded) return;

        const missileX = missile.x;
        const missileY = missile.y;

        const dx = missileX - absoluteX;
        const dy = missileY - absoluteY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= detectionRadiusPx && !detectedMissiles.current.has(missile.id)) {
          detectedMissiles.current.add(missile.id);

          // Only log globally once
          if (!loggedMissiles.has(missile.id)) {
            loggedMissiles.add(missile.id);

            console.log(
              `✅ Radar ${id} detected missile ${missile.id} at distance ${distance.toFixed(2)} px`
            );

            onLogsUpdate?.({
              timestamp: new Date().toLocaleTimeString(),
              source: `Radar ${id.slice(-4)}`,
              type: "missile_detected",
              message: `Detected missile ${missile.id.slice(-4)} at ${distance.toFixed(2)} px.`,
              payload: { missileId: missile.id, radarId: id, distance },
            });
          }

          // Relay to antenna regardless of logging
          const antenna = objectsRef.current.find(
            (u) => u.type === "antenna" && u.baseId === baseId
          );
        if (antenna) {
  socket.emit("unit-signal", {
    source: id,
    type: "relay-to-antenna",
    from: { x, y },
    to: { x: antenna.x, y: antenna.y },
    payload: { 
      missileId: missile.id, 
      currentX: missileX, 
      currentY: missileY,
      baseId: antenna.baseId // include baseId
    },
  });
}

        }
      });
    };

    const interval = setInterval(detectMissiles, 200); // check every 200ms
    return () => clearInterval(interval);
  }, [x, y, zoom, id, baseId, absoluteX, absoluteY, onLogsUpdate]);

  const detectionRadiusPx = baseRadius * (zoom / 7);

  return (
    <Group x={x} y={y}>
      <Circle radius={20} fill="green" shadowBlur={4} shadowColor="black" />
      <Circle
        radius={detectionRadiusPx}
        stroke="rgba(0,255,0,0.3)"
        strokeWidth={2}
        dash={[10, 5]}
      />
      {image && (
        <Image
          image={image}
          x={-20}
          y={-20}
          width={40}
          height={40}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2, false);
            ctx.closePath();
          }}
        />
      )}
      <Text text={`Freq: ${currentFrequency}`} x={-20} y={25} fill="#fff" fontSize={12} />
    </Group>
  );
}
