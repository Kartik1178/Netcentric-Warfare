import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import { useJammerDetection } from "./JammerDetection";
import socket from "../socket";

export default function Radar({
  id,
  x,
  y,
  radius = 20,
  objects,
  frequency = "2GHz",
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set());
  const latestObjects = useRef(objects);

  const [isJammed, setIsJammed] = useState(false);
  const isJammedRef = useRef(false); 
  const jammedUntil = useRef(0);

  useEffect(() => {
    latestObjects.current = objects;
  }, [objects]);

  useEffect(() => {
    isJammedRef.current = isJammed;
  }, [isJammed]);

  useJammerDetection({
    id,
    x,
    y,
    myFrequency: frequency,
    jammerHandler: (isAffected, jammer) => {
      const now = Date.now();
      if (isAffected) {
        jammedUntil.current = now + 1000;
      }
      const stillJammed = now < jammedUntil.current;
      setIsJammed(stillJammed);

      console.log(
        `[Radar ${id}] Jammed by ${jammer.id}? ${isAffected} → Still jammed? ${stillJammed}`
      );
    },
  });

  useEffect(() => {
    const detectionRadius = 150;

    const detectMissiles = () => {
      if (isJammedRef.current) {
        console.log(`[Radar ${id}] Jammed! Skipping detection.`);
        return;
      }

      const currentObjects = latestObjects.current;

      const threats = currentObjects.filter((obj) => {
        if (obj.type !== "missile") return false;

        const dx = obj.x - x;
        const dy = obj.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        console.log(
          `Checking missile ${obj.id} at (${obj.x}, ${obj.y}) → distance: ${distance.toFixed(
            2
          )}`
        );

        return distance <= detectionRadius;
      });

      threats.forEach((missile) => {
        if (!detectedMissiles.current.has(missile.id)) {
          console.log("Radar detected missile:", missile);
          socket.emit("relay-to-antenna", {
            source: "radar",
            type: "relay-to-antenna",
            from: { x, y },
            to: { x: 420, y: 325 },
            payload: {
              id: missile.id,
              x: missile.x,
              y: missile.y,
            },
          });
          detectedMissiles.current.add(missile.id);
          console.log(
            "Detected missiles so far:",
            Array.from(detectedMissiles.current)
          );
        }
      });
    };

    const interval = setInterval(detectMissiles, 1000);
    return () => clearInterval(interval);
  }, [x, y]); // No need to add isJammed here, we use the ref!

  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill={isJammed ? "gray" : "green"}
        shadowBlur={4}
        shadowColor="black"
      />
      <Circle
        radius={150}
        stroke="rgba(0,255,0,0.3)"
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
