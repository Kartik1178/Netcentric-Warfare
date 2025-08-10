import { useState, useEffect, useRef, useCallback } from "react";
import { Marker, Polygon } from "react-leaflet";
import GridCanvas from "./MapSimulatuion/GridCanvas";
import { useSDR } from "../hooks/SDRContext";
import { generateBaseUnits } from "../hooks/GenerateBaseUnits";
import socket from "./socket";
import { BASES } from "../constants/baseData";
import { useCentralAI } from "../hooks/useCentralAI";
import useFloatingMessages from "../hooks/useFloatingMessages";
import { useLeafletToKonvaTransform } from "../hooks/useLeafletToKonvaTransform";
import { useSmoothPositions } from "../hooks/useSmoothPositions";
import { useSubBaseUnits } from "../hooks/useSubBaseUnits";
import { getStyledBaseIcon } from "../utils/transparentIcon";

const LAUNCH_ZONES = [
  { id: "pakistan-north", polygon: [[35.0, 74.5],[34.0, 74.0],[33.5, 73.5],[33.5, 74.5]], color: "rgba(255,0,0,0.3)" },
  { id: "pakistan-south", polygon: [[25.5, 67.5],[25.0, 67.0],[24.5, 67.0],[24.5, 67.5]], color: "rgba(255,50,50,0.3)" },
  { id: "arabian-sea", polygon: [[22.0, 65.5],[20.0, 65.5],[18.0, 67.0],[18.0, 69.0],[22.0, 69.0]], color: "rgba(255,100,0,0.25)" },
  { id: "bay-of-bengal", polygon: [[17.0, 87.0],[15.0, 87.0],[13.0, 89.0],[14.0, 91.0],[17.0, 89.0]], color: "rgba(255,0,200,0.25)" },
  { id: "indian-ocean", polygon: [[10.0, 72.0],[7.0, 72.0],[6.0, 74.0],[7.0, 76.0],[10.0, 75.0]], color: "rgba(255,0,100,0.2)" },
];

export default function TerritoryMap({
  onLogsUpdate,
  newMissile,
  newJammer,
  zoom,
  center,
  mapInstance,
  mapSize,
  focusMode,
  setFocusMode,
  selectedBaseId,
  setSelectedBaseId,
}) {
  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  
  // Create a ref for showMessage
  const showMessageRef = useRef(null);
  const [floatingMessages, showMessage] = useFloatingMessages();
  // Update the ref's current value whenever showMessage changes
  useEffect(() => {
    showMessageRef.current = showMessage;
  }, [showMessage]);

  const [globalObjects, setGlobalObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]); // This is unused, can be removed
  const [explosions, setExplosions] = useState([]);
  const spawnedMissiles = useRef(new Set());
  const [activeInterceptors, setActiveInterceptors] = useState([]);

  // Ref to store last logged detection timestamp per missile (for rate-limiting radar logs)
  const loggedMissileDetections = useRef(new Map());
  const LOG_COOLDOWN_MS = 500; // Only log a detection for the same missile every 500ms

  // 🔹 Convert lat/lng → Konva pixel positions for bases
  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({
    mapInstance,
    baseData: BASES,
    mapSize,
  });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);

  // 🔹 Generate Units for all sub-bases
  const generateUnitsForBase = (baseId) => {
    const baseData = BASES.find((b) => b.id === baseId);
    if (!baseData) return [];

    return Array.from({ length: 4 }).flatMap((_, i) => {
      const subBaseId = `${baseId}-sub${i + 1}`;
      const localUnits = generateBaseUnits(subBaseId, baseData.type, 60);
      return localUnits.map((u) => ({
        ...u,
        localX: u.x,
        localY: u.y,
        x: u.x,
        y: u.y,
      }));
    });
  };

  // 1️⃣ Initialize Base Units
  useEffect(() => {
    if (!pixelPositions || Object.keys(pixelPositions).length === 0) return;

    const allUnits = focusMode && selectedBaseId
      ? generateUnitsForBase(selectedBaseId)
      : BASES.flatMap((base) => generateUnitsForBase(base.id));

    setGlobalObjects((prev) => [
      ...prev.filter((o) => o.type === "missile" || o.type === "interceptor"),
      ...allUnits,
    ]);
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);


  // 2️⃣ Handle New Missile Spawn
  useEffect(() => {
    if (!newMissile || spawnedMissiles.current.has(newMissile.id)) return;
    const { startLat, startLng, targetLat, targetLng } = newMissile;
    if (startLat == null || startLng == null || targetLat == null || targetLng == null) return;

    const missileObj = {
      id: newMissile.id,
      type: "missile",
      lat: startLat,
      lng: startLng,
      targetLat,
      targetLng,
      baseId: newMissile.baseId,
      speed: 0.05, // Missile speed
      exploded: false,
    };

    setGlobalObjects((prev) => [...prev, missileObj]);
    spawnedMissiles.current.add(newMissile.id);

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "TerritoryMap",
      type: "spawn",
      message: `Missile ${missileObj.id} spawned targeting base ${missileObj.baseId}`,
      payload: missileObj,
    });
  }, [newMissile]);


  // Handle Interceptor Launch
  const handleInterceptorLaunch = useCallback(({ launcherX, launcherY, targetX, targetY, threatId }) => {
    const interceptorObj = {
      id: `interceptor-${Date.now()}`,
      type: "interceptor",
      x: launcherX,
      y: launcherY,
      targetX,
      targetY,
      threatId, // ID of the missile it's targeting
      speed: 25, // Interceptor speed (must be faster than missile)
      exploded: false,
    };
    setActiveInterceptors((prev) => [...prev, interceptorObj]);
    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "LauncherUnit", // ⚡️ CHANGED: Source is now LauncherUnit for clarity
      type: "launch",
      message: `Interceptor ${interceptorObj.id.substring(interceptorObj.id.length - 4)} launched from [${launcherX}, ${launcherY}] targeting missile ${threatId.substring(threatId.length - 4)}`,
      payload: interceptorObj,
    });
  }, [onLogsUpdate]);


  // 3️⃣ Animate Missiles and Interceptors in Konva Pixel Coordinates
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setGlobalObjects((prevGlobalObjects) => {
        const updatedObjects = prevGlobalObjects.map((obj) => {
          if (obj.type === "missile" && !obj.exploded) {
            // Missile animation (lat/lng based, converted to pixels for display)
            const dx = obj.targetLng - obj.lng;
            const dy = obj.targetLat - obj.lat;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.001) {
              return { ...obj, lat: obj.targetLat, lng: obj.targetLng, reached: true };
            }

            return {
              ...obj,
              lat: obj.lat + (dy / dist) * obj.speed,
              lng: obj.lng + (dx / dist) * obj.speed,
            };
          } else if (obj.type === "interceptor" && !obj.exploded) {
            // Interceptor animation (pixel based)
            const dx = obj.targetX - obj.x;
            const dy = obj.targetY - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5) { // Close enough to target pixel
              return { ...obj, x: obj.targetX, y: obj.targetY, reached: true };
            }

            return {
              ...obj,
              x: obj.x + (dx / dist) * obj.speed,
              y: obj.y + (dy / dist) * obj.speed,
            };
          }
          return obj;
        });
        return updatedObjects;
      });

      setActiveInterceptors((prevInterceptors) => {
        return prevInterceptors.map((intc) => {
          if (intc.exploded) return intc; // Already exploded

          const dx = intc.targetX - intc.x;
          const dy = intc.targetY - intc.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) { // Close enough to target pixel
            return { ...intc, x: intc.targetX, y: intc.targetY, reached: true };
          }

          return {
            ...intc,
            x: intc.x + (dx / dist) * intc.speed,
            y: intc.y + (dy / dist) * intc.speed,
          };
        });
      });

    }, 30); // Run animation every 30ms

    return () => clearInterval(animationInterval);
  }, []); // No dependencies for the interval itself

  // Collision Detection
  useEffect(() => {
    const collisionCheckInterval = setInterval(() => {
      let newExplosions = [];
      let updatedMissiles = new Set(); // To track missiles that exploded
      let updatedInterceptors = new Set(); // To track interceptors that exploded

      // Filter out active missiles and interceptors from globalObjects
      const currentMissiles = globalObjects.filter(obj => obj.type === 'missile' && !obj.exploded);
      const currentInterceptors = activeInterceptors.filter(obj => obj.type === 'interceptor' && !obj.exploded);

      currentInterceptors.forEach(interceptor => {
        currentMissiles.forEach(missile => {
          // Convert missile's lat/lng to pixel coordinates for collision check
          const missilePixelPos = mapInstance?.latLngToContainerPoint([missile.lat, missile.lng]);
          if (!missilePixelPos) return;

          const dx = missilePixelPos.x - interceptor.x;
          const dy = missilePixelPos.y - interceptor.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const collisionThreshold = 30; // Pixels radius for collision

          if (distance < collisionThreshold && !interceptor.exploded && !missile.exploded) {
            console.log(`💥 COLLISION: Interceptor ${interceptor.id} hit Missile ${missile.id}!`);
            newExplosions.push({ x: missilePixelPos.x, y: missilePixelPos.y });

            updatedMissiles.add(missile.id);
            updatedInterceptors.add(interceptor.id);

            onLogsUpdate?.({
              timestamp: new Date().toLocaleTimeString(),
              source: "TerritoryMap", // Keep this as TerritoryMap or change to "CollisionSystem"
              type: "collision",
              message: `Interceptor ${interceptor.id.substring(interceptor.id.length - 4)} intercepted Missile ${missile.id.substring(missile.id.length - 4)}!`,
              payload: { interceptorId: interceptor.id, missileId: missile.id, location: missilePixelPos },
            });
          }
        });
      });

      if (newExplosions.length > 0) {
        setExplosions(prev => [...prev, ...newExplosions]);

        // Mark collided objects as exploded in their respective states
        setGlobalObjects(prev =>
          prev.map(obj => {
            if (obj.type === 'missile' && updatedMissiles.has(obj.id)) {
              return { ...obj, exploded: true };
            }
            return obj;
          })
        );
        setActiveInterceptors(prev =>
          prev.map(obj => {
            if (obj.type === 'interceptor' && updatedInterceptors.has(obj.id)) {
              return { ...obj, exploded: true };
            }
            return obj;
          })
        );
      }
    }, 50); // Check for collisions frequently

    return () => clearInterval(collisionCheckInterval);
  }, [globalObjects, activeInterceptors, mapInstance, onLogsUpdate]);


  // Handle Missile Explosions (when reached target)
  useEffect(() => {
    globalObjects.forEach((obj) => {
      if (obj.type === "missile" && obj.reached && !obj.exploded) {
        const point = mapInstance?.latLngToContainerPoint([obj.lat, obj.lng]);
        if (point) setExplosions((prev) => [...prev, { x: point.x, y: point.y }]);

        setGlobalObjects((prev) =>
          prev.map((m) => (m.id === obj.id ? { ...m, exploded: true } : m))
        );
        onLogsUpdate?.({
          timestamp: new Date().toLocaleTimeString(),
          source: "TerritoryMap",
          type: "impact",
          message: `Missile ${obj.id.substring(obj.id.length - 4)} impacted target!`,
          payload: obj,
        });
      }
    });
  }, [globalObjects, mapInstance, onLogsUpdate]);


  // Central AI
  useCentralAI(
    globalObjects, // Pass all objects for AI to consider
    (log) => {
      // Central AI logs are now floating messages, so this is less critical for main log
      // onLogsUpdate?.({ /* ... */ }); // This is now correctly removed from useCentralAI
    },
    (signal) => socket.emit("unit-signal", signal),
    showMessageRef.current // Pass the ref's current value for showMessage
  );

  // 🔹 Handle unit signals (missile detection, antenna relay)
  useEffect(() => {
    const handleUnitSignal = (signal) => {
      // Handle Radar Missile Detection logs (with rate-limiting)
      if (signal.type === "missile-detection") {
        const { payload } = signal;
        const missileId = payload.missileId;
        const now = Date.now();

        // Rate-limiting check: Only log if this missile hasn't been logged recently
        const lastLoggedTime = loggedMissileDetections.current.get(missileId);
        if (!lastLoggedTime || (now - lastLoggedTime > LOG_COOLDOWN_MS)) {
          console.log(`🎯 Missile detected by ${payload.detectedBy}:`, payload);
          
          onLogsUpdate?.({
            timestamp: new Date().toLocaleTimeString(),
            source: "RadarSystem",
            type: "detection",
            message: `Missile ${payload.missileId.substring(payload.missileId.length - 4)} detected by ${payload.detectedBy.substring(payload.detectedBy.length - 4)} at ${payload.distance.toFixed(2)}km - Pos: ${payload.currentLat.toFixed(4)}, ${payload.currentLng.toFixed(4)}`,
            payload: {
              ...payload,
              detectionLat: payload.currentLat,
              detectionLng: payload.currentLng,
              detectionTime: new Date().toISOString()
            },
          });

          // Update the last logged time for this missile
          loggedMissileDetections.current.set(missileId, now);
        }
      } 
      // Handle Antenna Relay to Central AI logs
      else if (signal.type === "relay-to-c2" && signal.source === "antenna") {
        const { payload } = signal;
        onLogsUpdate?.({
          timestamp: new Date().toLocaleTimeString(),
          source: "AntennaSystem",
          type: "transmission",
          message: `Antenna ${signal.payload.targetAntennaId.substring(signal.payload.targetAntennaId.length - 4)} relayed missile ${payload.missileId.substring(payload.missileId.length - 4)} data to Central AI.`,
          payload: payload, // Pass the entire payload for consistency
        });
        console.log(`📡 Antenna ${signal.payload.targetAntennaId} relayed to C2:`, payload);
      }
    };

    socket.on("unit-signal", handleUnitSignal);
    return () => socket.off("unit-signal", handleUnitSignal);
  }, [onLogsUpdate]);

  // 🔹 Visible objects (combined for GridCanvas)
  const visibleObjects =
    focusMode && selectedBaseId
      ? [...globalObjects, ...activeInterceptors].filter(
          (obj) =>
            obj.baseId === selectedBaseId ||
            obj.baseId?.startsWith(`${selectedBaseId}-sub`) ||
            obj.type === "missile" ||
            obj.type === "interceptor"
        )
      : [...globalObjects, ...activeInterceptors]; // Combine all for global view

  const focusBaseZones =
    focusMode && selectedBaseId
      ? { [selectedBaseId]: smoothBasePositions[selectedBaseId] }
      : smoothBasePositions;

  // 🔹 Convert missiles to pixel coordinates (only missiles from globalObjects)
  const missilesInPixels = visibleObjects
    .filter((o) => o.type === "missile" && !o.exploded)
    .map((obj) => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point.x, y: point.y };
    })
    .filter(Boolean);

  // Interceptors in pixels (from activeInterceptors)
  const interceptorsInPixels = visibleObjects
    .filter((o) => o.type === "interceptor" && !o.exploded)
    .map((obj) => {
      // Interceptors are already in pixel coordinates
      return { ...obj };
    })
    .filter(Boolean);


  const baseUnitsLocal = visibleObjects.filter(
    (o) => o.type !== "missile" && o.type !== "interceptor"
  );
  const scaledBaseUnits = useSubBaseUnits(baseUnitsLocal, konvaZoom);

  console.log("TerritoryMap floatingMessages state:", floatingMessages);

  return (
    <>
      {/* 🔹 Launch Zones */}
      {LAUNCH_ZONES.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.polygon}
          pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.3 }}
        />
      ))}

      {/* 🔹 Base Markers */}
      {mapInstance && BASES.map((base) => (
        <Marker
          key={base.id}
          position={base.coords}
          zIndexOffset={2000}
          icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
          eventHandlers={{
            click: (e) => {
              console.log(`🎯 Base marker clicked: ${base.id}`, base.coords);
              e.originalEvent.stopPropagation();
              setFocusMode(true);
              setSelectedBaseId(base.id);
              mapInstance.flyTo(base.coords, 15, { animate: true });
            },
          }}
        />
      ))}

      {/* 🎨 Konva Canvas Overlay */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 400, pointerEvents: "none" }} // Balanced z-index - above map but below markers
      >
        <GridCanvas
          width={mapSize.width}
          height={mapSize.height}
          style={{ pointerEvents: "none" }} // Konva won't intercept
          explosions={explosions}
          setExplosions={setExplosions}
          objects={[...scaledBaseUnits, ...missilesInPixels, ...interceptorsInPixels]}
          // incomingSignals={incomingSignals} // incomingSignals is not used, can remove if not needed
          // setIncomingSignals={setIncomingSignals} // setIncomingSignals is not used, can remove if not needed
          jammerReports={jammerReports}
          setJammerReports={setJammerReports}
          currentFrequency={currentFrequency}
          setCurrentFrequency={setCurrentFrequency}
          availableFrequencies={availableFrequencies}
          focusMode={focusMode}
          baseZones={focusBaseZones}
          zoom={konvaZoom}
          center={center}
          selectedBaseId={selectedBaseId}
          floatingMessages={floatingMessages}
          onBaseClick={() => {}}
          onLaunchInterceptor={handleInterceptorLaunch}
          onLogsUpdate={onLogsUpdate} // Pass onLogsUpdate to GridCanvas
        />
      </div>
    </>
  );
}