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
  baseId, // Radar's baseId (e.g., 'srinagar-main-sub1')
  radius = 20,
  objects = [],
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
  lat = null,
  lng = null,
}) {
  const [image] = useImage("/satellite-dish.png");
  const detectedMissiles = useRef(new Set());
  const latestObjects = useRef(objects);
  const [isJammed, setIsJammed] = useState(false);
  const isJammedRef = useRef(false);
  const jammedUntil = useRef(0);
  const previousJammedState = useRef(null);
  const antennaRef = useRef(null); // ⚡️ NEW: Create a ref to store the antenna object

  // Always update objects reference
  useEffect(() => {
    latestObjects.current = objects;
  }, [objects]);

  // ⚡️ NEW: Effect to find and update the antenna reference
  useEffect(() => {
    const potentialAntennas = latestObjects.current.filter(obj => obj.type === "antenna" && obj.baseId === baseId);
    antennaRef.current = potentialAntennas[0] || null; // Store the antenna or null if not found
    console.log(`[Radar ${id}] Initializing/Updating antennaRef: Found ${potentialAntennas.length} antennas. Current antennaRef.current: ${antennaRef.current?.id || 'null'}`);
  }, [latestObjects, baseId]); // Re-run when objects or baseId change


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
        // console.log(`[Radar ${id}] Received frequency-change:`, data);
      }
    };
    socket.on("frequency-change", handleFrequencyChange);
    return () => socket.off("frequency-change", handleFrequencyChange);
  }, [id]);

  // Jammer Detection hook
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

      if (previousJammedState.current !== stillJammed) {
        console.log(
          `[Radar ${id}] Jammed by ${jammer.id}? ${isAffected} → Still jammed? ${stillJammed}`
        );
        previousJammedState.current = stillJammed;
      }
    },
    setJammerReports,
  });

  // Missile detection loop - Updated for lat/lng coordinates
  useEffect(() => {
    const detectionRadiusKm = 200; // Increased to 200km for initial testing

    // Calculate distance between two lat/lng points in kilometers (Haversine formula)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const detectMissiles = () => {
      if (isJammedRef.current) {
        console.log(`[Radar ${id}] Jammed! Skipping detection.`);
        return;
      }

      const currentObjects = latestObjects.current || [];
      const radarLat = lat;
      const radarLng = lng;

      // 🔍 DIAGNOSTIC LOGS: Radar's own position and baseId
      console.log(`[Radar ${id}] Running detection. My baseId: ${baseId}, My Lat: ${radarLat?.toFixed(4)}, Lng: ${radarLng?.toFixed(4)}`);
      
      if (radarLat === null || radarLng === null) {
        console.warn(`[Radar ${id}] Radar's lat/lng are NULL. Cannot perform geographical detection.`);
        return;
      }

      // 🔍 DIAGNOSTIC LOGS: Use antennaRef.current directly
      const currentAntenna = antennaRef.current; 
      if (!currentAntenna) {
        console.warn(`[Radar ${id}] No antenna found in my base (${baseId}). Cannot relay detection.`);
      }


      const threats = currentObjects.filter((obj) => {
        if (obj.type !== "missile" || obj.exploded) return false;

        if (obj.lat == null || obj.lng == null) {
          return false;
        }

        const distance = calculateDistance(radarLat, radarLng, obj.lat, obj.lng);
        
        // 🔍 DIAGNOSTIC LOGS: Missile details and distance calculation
        // console.log(`[Radar ${id}] Checking Missile ${obj.id}: Missile Lat ${obj.lat.toFixed(4)}, Lng ${obj.lng.toFixed(4)}. Distance: ${distance.toFixed(2)} km (Radius: ${detectionRadiusKm} km).`);

        return distance <= detectionRadiusKm;
      });

      threats.forEach((missile) => {
        if (!detectedMissiles.current.has(missile.id)) {
          let vx, vy, distance;

          const dx = missile.targetLng - missile.lng;
          const dy = missile.targetLat - missile.lat;
          distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) return;

          vx = (dx / distance) * missile.speed;
          vy = (dy / distance) * missile.speed;

          console.log(
            `[Radar ${id}] ✅ MISSILE DETECTED: ${missile.id}! Position: Lat ${missile.lat.toFixed(4)}, Lng ${missile.lng.toFixed(4)}. VelocityX: ${vx.toFixed(4)}, VelocityY: ${vy.toFixed(4)}`
          );

          // Emit detection signal with lat/lng coordinates (for TerritoryMap log)
          socket.emit("unit-signal", {
            source: `${id}`,
            type: "missile-detection",
            from: { lat: radarLat, lng: radarLng },
            to: { lat: missile.lat, lng: missile.lng },
            payload: {
              missileId: missile.id,
              detectedBy: id,
              currentLat: missile.lat,
              currentLng: missile.lng,
              targetLat: missile.targetLat,
              targetLng: missile.targetLng,
              velocityX: vx,
              velocityY: vy,
              distance: calculateDistance(radarLat, radarLng, missile.lat, missile.lng),
              timestamp: Date.now()
            },
          });

          // Emit to antenna if available, using antennaRef.current
          if (currentAntenna) { // Use the variable from antennaRef.current
            console.log(`[Radar ${id}] Attempting to relay to antenna ${currentAntenna.id} in base ${currentAntenna.baseId}.`);
            socket.emit("unit-signal", {
              source: `${id}`,
              type: "relay-to-antenna",
              from: { x: x, y: y }, // Pixel coordinates for visual line if needed
              to: { x: currentAntenna.x, y: currentAntenna.y }, // Pixel coordinates for visual line if needed
              payload: {
                id: missile.id,
                // Include pixel coordinates for Konva if needed for antenna logic
                currentX: missile.x ?? missile.currentX,
                currentY: missile.y ?? missile.currentY,
                vx: parseFloat(vx.toFixed(2)),
                vy: parseFloat(vy.toFixed(2)),
                targetAntennaId: currentAntenna.id, // Use currentAntenna.id
                // Include geographical coordinates for antenna to relay to C2
                currentLat: missile.lat,
                currentLng: missile.lng,
                targetLat: missile.targetLat,
                targetLng: missile.targetLng,
                velocityX: vx,
                velocityY: vy,
              },
            });
          } else {
            console.warn(`[Radar ${id}] Could not find an antenna in base ${baseId} to relay signal!`);
          }

          detectedMissiles.current.add(missile.id);
        }
      });
    };

    const interval = setInterval(detectMissiles, 1000); // Check every 1 second
    return () => clearInterval(interval);
  }, [id, lat, lng, baseId]); // ⚡️ UPDATED: Removed 'antenna' from dependencies

  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill={isJammed ? "gray" : "green"}
        shadowBlur={4}
        shadowColor="black"
      />
      <Circle
        radius={200} // This is the visual Konva circle, not the detection radius in km
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
