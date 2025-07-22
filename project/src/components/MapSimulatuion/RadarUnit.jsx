import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle, Text } from "react-konva";
import useImage from "use-image";
import { useJammerDetection } from "../../hooks/JammerDetection";
import { useCognitiveRadio } from "../../hooks/useCognitiveRadio";
import socket from "../socket";

export default function Radar({
  id,
  x,
  y,
  baseid,
  radius = 20,
  objects,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set());
  const latestObjects = useRef(objects);
const antenna = latestObjects.current.find(
  (obj) => obj.type === "antenna" && obj.baseid === baseid
);

  const [isJammed, setIsJammed] = useState(false);
  const isJammedRef = useRef(false);
  const jammedUntil = useRef(0);

  // Update object ref on change
  useEffect(() => {
    latestObjects.current = objects;
  }, [objects]);

  // Cognitive Radio hook
  useCognitiveRadio({
    id,
    jammerReports,
    availableFrequencies,
    currentFrequency,
    setCurrentFrequency,
  });

  // Update jammed ref
  useEffect(() => {
    isJammedRef.current = isJammed;
  }, [isJammed]);

  // Listen for frequency change
  useEffect(() => {
    const handleFrequencyChange = (data) => {
      if (data.unitId !== id) {
        console.log(`[Radar ${id}] Received frequency-change:`, data);
      }
    };
    socket.on("frequency-change", handleFrequencyChange);
    return () => socket.off("frequency-change", handleFrequencyChange);
  }, [id]);

  // Jammer detection
const previousJammedState = useRef(null);

useJammerDetection({
  id,
  x,
  y,
  myFrequency: currentFrequency,
  jammerHandler: (isAffected, jammer) => {
    const now = Date.now();
    if (isAffected) jammedUntil.current = now + 1000;

    const stillJammed = now < jammedUntil.current;
    setIsJammed(stillJammed);

    // Only log on change
    if (previousJammedState.current !== stillJammed) {
      console.log(
        `[Radar ${id}] Jammed by ${jammer.id}? ${isAffected} → Still jammed? ${stillJammed}`
      );
      previousJammedState.current = stillJammed;
    }
  },
  setJammerReports,
});


  // Missile detection loop
  useEffect(() => {
    const detectionRadius = 200;

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
        return distance <= detectionRadius;
      });

      threats.forEach((missile) => {
        if (!detectedMissiles.current.has(missile.id)) {
          const dx = missile.targetX - missile.x;
          const dy = missile.targetY - missile.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance === 0) return; // avoid div by zero

        
let vx = 0, vy = 0;
if (distance > 0) {
  vx = (dx / distance) * missile.speed;
  vy = (dy / distance) * missile.speed;
}

          console.log(`[Radar ${id}] Missile ${missile.id}: vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`);
if (antenna) {
  socket.emit("unit-signal", {
    source: `${id}`,
    type: "relay-to-antenna",
    from: { x, y },
    to: { x: antenna.x, y: antenna.y }, // ✅ Dynamic antenna position
    payload: {
      id: missile.id,
      currentX: Math.ceil(missile.x * 100) / 100,
      currentY: Math.ceil(missile.y * 100) / 100,
      vx: parseFloat(vx.toFixed(2)),
      vy: parseFloat(vy.toFixed(2)),
      targetAntennaId: antenna?.id,
    },
  });
}

          detectedMissiles.current.add(missile.id);
        }
      });
    };

    const interval = setInterval(detectMissiles, 1000);
    return () => clearInterval(interval);
  }, [x, y]);

  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill={isJammed ? "gray" : "green"}
        shadowBlur={4}
        shadowColor="black"
      />
      <Circle
        radius={200}
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
      <Text
        text={`Freq: ${currentFrequency}`}
        x={-radius}
        y={radius + 5}
        fill="#fff"
        fontSize={12}
      />
    </Group>
  );
}
