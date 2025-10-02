import React, { useEffect, useRef, useState } from "react";
import { Group, Circle, Text, Image } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import Konva from "konva";

const loggedObjects = new Set();

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
  radius = 12,
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedObjects = useRef(new Set());
  const baseRadius = 150;

  const [pulseKey, setPulseKey] = useState(0);
  const pulseRef = useRef();
  const objectsRef = useRef(objects);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  useEffect(() => {
    const detectObjects = () => {
      const detectionRadiusPx = baseRadius * (zoom / 7);

      objectsRef.current.forEach((obj) => {
        // Only detect missile, drone, or artillery
        if (!["missile", "drone", "artillery"].includes(obj.type) || obj.exploded) return;

        const dx = obj.x - absoluteX;
        const dy = obj.y - absoluteY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= detectionRadiusPx) {
          const vx = obj.vx ?? 0;
          const vy = obj.vy ?? 0;

          // Trigger pulse & log only once per object
          if (!detectedObjects.current.has(obj.id)) {
            detectedObjects.current.add(obj.id);
            setPulseKey((prev) => prev + 1);

            if (!loggedObjects.has(obj.id)) {
              loggedObjects.add(obj.id);
              onLogsUpdate?.({
                timestamp: new Date().toLocaleTimeString(),
                source: `Radar ${id.slice(-4)}`,
                type: `${obj.type}_detected`,
                message: `Detected ${obj.type} ${obj.id.slice(-4)} at ${distance.toFixed(2)} px.`,
                payload: { objectId: obj.id, radarId: id, distance },
              });
            }
          }

          // Find nearest antenna for the same base
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
                objectId: obj.id,
                type: obj.type,
                currentX: obj.x,
                currentY: obj.y,
                vx,
                vy,
                baseId: antenna.baseId,
              },
            });
          }
        }
      });
    };

    const interval = setInterval(detectObjects, 200);
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
      <Circle radius={radius} fill="green" shadowBlur={4} shadowColor="black" />
      <Circle
        radius={detectionRadiusPx}
        stroke="rgba(0,255,0,0.3)"
        strokeWidth={2}
        dash={[10, 5]}
      />
      <Circle ref={pulseRef} radius={0} stroke="lime" strokeWidth={2} opacity={0} />
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
