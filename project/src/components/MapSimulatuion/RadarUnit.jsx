import React, { useEffect, useRef } from "react";
import { Circle, Group, Text } from "react-konva";
import socket from "../../socket";

const RadarUnit = ({ radar, missiles }) => {
console.log('Radar')
  const detectionRadius = radar?.detectionRadius || 150; // 🔥 CHANGE (optional chaining for safety)
  const intervalRef = useRef(null);

  // 🔥 CHANGE: Normalize missiles to always be an array
  const missileList = Array.isArray(missiles) ? missiles : [];

  console.log("🖥️ [Render] RadarUnit component rendered with props:", {
    radar,
    missilesCount: missileList.length, // 🔥 CHANGE (use missileList not missiles)
    missiles: missileList,             // 🔥 CHANGE (use missileList not missiles)
  });

  useEffect(() => {
    console.log(
      `🟢 [RadarUnit Mount] Radar ${radar?.id} (Base ${radar?.baseId}) mounted at (${radar?.x}, ${radar?.y}) with radius ${detectionRadius}`
    );

    // Clear any previous interval when component re-renders
    if (intervalRef.current) {
      console.log(`♻️ [RadarUnit Cleanup] Clearing old interval for Radar ${radar?.id}`);
      clearInterval(intervalRef.current);
    }

    // Continuous detection loop
    intervalRef.current = setInterval(() => {
      if (missileList.length === 0) { // 🔥 CHANGE (use missileList instead of missiles directly)
        console.log(`⚠️ [Radar ${radar?.id}] No missiles in array to check`);
        return;
      }

      console.log(
        `🔍 [Radar ${radar?.id}] Scanning ${missileList.length} missile(s)...`
      );

      missileList.forEach((missile) => { // 🔥 CHANGE (iterate missileList)
        if (!missile) { // 🔥 CHANGE (guard against null missile objects)
          console.warn(`⚠️ [Radar ${radar?.id}] Encountered invalid missile:`, missile);
          return;
        }

        console.log(
          `➡️ [Radar ${radar?.id}] Checking missile ${missile.id} at (${missile.x}, ${missile.y})`
        );

        const dx = missile.x - radar.x;
        const dy = missile.y - radar.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        console.log(
          `📏 [Radar ${radar?.id}] Distance to missile ${missile.id}: ${distance.toFixed(
            2
          )} (threshold: ${detectionRadius})`
        );

        if (distance <= detectionRadius) {
          console.log(
            `🚨 [Radar ${radar?.id}] DETECTED missile ${missile.id} at (${missile.x}, ${missile.y})`
          );

          // Emit to central AI / antenna
          console.log(
            `📡 [Radar ${radar?.id}] Emitting detection of missile ${missile.id} to antenna/centralAI`
          );
          socket.emit("relay-to-antenna", {
            radarId: radar.id,
            baseId: radar.baseId,
            missile,
          });
        }
      });
    }, 300); // check every 300ms

    return () => {
      console.log(`🛑 [RadarUnit Unmount] Clearing interval for Radar ${radar?.id}`);
      clearInterval(intervalRef.current);
    };
  }, [missileList, radar]); // 🔥 CHANGE (depend on missileList instead of missiles)

  return (
    <Group>
      <Circle
        x={radar.x}
        y={radar.y}
        radius={detectionRadius}
        stroke="green"
        dash={[4, 4]}
      />
      <Circle x={radar.x} y={radar.y} radius={10} fill="darkgreen" />
      <Text
        x={radar.x + 12}
        y={radar.y - 5}
        text={`Radar ${radar.id}`}
        fontSize={12}
        fill="white"
      />
    </Group>
  );
};

export default RadarUnit;
