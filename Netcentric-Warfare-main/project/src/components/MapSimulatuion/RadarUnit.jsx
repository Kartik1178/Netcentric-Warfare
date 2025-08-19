import React, { useEffect, useRef } from "react";
import { Group, Circle, Text, Image } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import { latLngToStageCoords } from "../../utils/leafletToKonva";

export default function Radar({
  id,
  baseId,
  lat,
  lng,
  objects = [], // all units including missiles
  mapInstance,
  stageContainer,
  zoom = 7,
  currentFrequency,
  onLogsUpdate
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set());

  const baseRadius = 150; // pixels at zoom 7

  // Keep latest objects reference
  const objectsRef = useRef(objects);
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    if (!mapInstance || !stageContainer) return;
console.log(`[Radar ${id.slice(-4)}] useEffect fired`, { mapInstance, stageContainer });

  if (!mapInstance || !stageContainer) {
    console.warn(`[Radar ${id.slice(-4)}] mapInstance or stageContainer missing`);
    return;}
    const detectMissiles = () => {
      // Always recalc radar position
      
  console.log(`[Radar ${id.slice(-4)}] running detection loop`);

      const { x: radarX, y: radarY } = latLngToStageCoords(
        mapInstance,
        { lat, lng },
        stageContainer
      );
      const detectionRadiusPx = baseRadius * (zoom / 7);

      objectsRef.current.forEach((missile) => {
        if (missile.type !== "missile" || missile.exploded) return;

        const missilePos = latLngToStageCoords(
          mapInstance,
          { lat: missile.lat, lng: missile.lng },
          stageContainer
        );

        const dx = missilePos.x - radarX;
        const dy = missilePos.y - radarY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        console.log(
          `[Radar ${id.slice(-4)}] Missile ${missile.id.slice(-4)} dist: ${distance.toFixed(
            1
          )}, radius: ${detectionRadiusPx.toFixed(1)}`
        );

        if (
          distance <= detectionRadiusPx &&
          !detectedMissiles.current.has(missile.id)
        ) {
          detectedMissiles.current.add(missile.id);

          // Simulation log
          onLogsUpdate?.({
            timestamp: new Date().toLocaleTimeString(),
            source: `Radar ${id.slice(-4)}`,
            type: "missile_detected",
            message: `Detected missile ${missile.id.slice(-4)} at ${distance.toFixed(
              2
            )} px.`,
            payload: { missileId: missile.id, radarId: id, distance }
          });

          // Relay to antenna if exists
          const antenna = objectsRef.current.find(
            (u) => u.type === "antenna" && u.baseId === baseId
          );
          if (antenna) {
            socket.emit("unit-signal", {
              source: id,
              type: "relay-to-antenna",
              from: { x: radarX, y: radarY },
              to: { x: antenna.x, y: antenna.y },
              payload: {
                missileId: missile.id,
                currentX: missilePos.x,
                currentY: missilePos.y
              }
            });
          }
        }
      });
    };

    // Run detection every animation frame
    let animationFrame;
    const loop = () => {
      detectMissiles();
      animationFrame = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrame);
  }, [mapInstance, stageContainer, lat, lng, zoom, id, baseId, onLogsUpdate]);

  // Position for drawing
  const radarPos = latLngToStageCoords(mapInstance, { lat, lng }, stageContainer);
  const radarX = radarPos.x;
  const radarY = radarPos.y;
  const detectionRadiusPx = baseRadius * (zoom / 7);

  return (
    <Group x={radarX} y={radarY}>
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
      <Text
        text={`Freq: ${currentFrequency}`}
        x={-20}
        y={25}
        fill="#fff"
        fontSize={12}
      />
    </Group>
  );
}
