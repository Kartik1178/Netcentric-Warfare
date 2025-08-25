import React, { useEffect, useRef, useState } from "react";
import { Group, Circle, Text, Image } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import Konva from "konva";

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
  radius = 12, // <-- dynamically passed from GridCanvas, just like Antenna
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set());
  const baseRadius = 150;

  const [pulseKey, setPulseKey] = useState(0);
  const pulseRef = useRef();
  const objectsRef = useRef(objects);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  useEffect(() => {
    const detectMissiles = () => {
      const detectionRadiusPx = baseRadius * (zoom / 7);

      objectsRef.current.forEach((missile) => {
        if (missile.type !== "missile" || missile.exploded) return;

        const dx = missile.x - absoluteX;
        const dy = missile.y - absoluteY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= detectionRadiusPx) {
          const vx = missile.vx ?? 0;
          const vy = missile.vy ?? 0;

          if (!detectedMissiles.current.has(missile.id)) {
            detectedMissiles.current.add(missile.id);
            setPulseKey((prev) => prev + 1);

            if (!loggedMissiles.has(missile.id)) {
              loggedMissiles.add(missile.id);
              onLogsUpdate?.({
                timestamp: new Date().toLocaleTimeString(),
                source: `Radar ${id.slice(-4)}`,
                type: "missile_detected",
                message: `Detected missile ${missile.id.slice(-4)} at ${distance.toFixed(2)} px.`,
                payload: { missileId: missile.id, radarId: id, distance },
              });
            }
          }

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
                currentX: missile.x,
                currentY: missile.y,
                vx,
                vy,
                baseId: antenna.baseId,
              },
            });
          }
        }
      });
    };

    const interval = setInterval(detectMissiles, 200);
    return () => clearInterval(interval);
  }, [x, y, zoom, id, baseId, absoluteX, absoluteY, onLogsUpdate]);

  useEffect(() => {
    if (!pulseRef.current) return;
    const node = pulseRef.current;
    node.radius(0);
    node.opacity(0.6);
    node.to({
      radius: baseRadius * (zoom / 7),
      opacity: 0,
      duration: 1,
      easing: Konva.Easings.EaseOut,
    });
  }, [pulseKey, zoom]);

  const detectionRadiusPx = baseRadius * (zoom / 7);

  return (
    <Group x={x} y={y}>
      {/* Main Radar Unit Circle */}
      <Circle radius={radius} fill="green" shadowBlur={4} shadowColor="black" />

      {/* Detection Zone (unchanged) */}
      <Circle
        radius={detectionRadiusPx}
        stroke="rgba(0,255,0,0.3)"
        strokeWidth={2}
        dash={[10, 5]}
      />

      {/* Pulse Animation */}
      <Circle ref={pulseRef} radius={0} stroke="lime" strokeWidth={2} opacity={0} />

      {/* Radar Icon scaled to radius */}
      {image && (
        <Image
          image={image}
          width={radius * 1.6}
          height={radius * 1.6}
          x={-(radius * 0.8)}
          y={-(radius * 0.8)}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2, false);
            ctx.closePath();
          }}
        />
      )}

      {/* Frequency Label */}
      <Text
        text={`Freq: ${currentFrequency || "N/A"}`}
        x={-radius}
        y={radius + 5}
        fill="#fff"
        fontSize={12}
        align="center"
        width={radius * 2}
      />
    </Group>
  );
}
