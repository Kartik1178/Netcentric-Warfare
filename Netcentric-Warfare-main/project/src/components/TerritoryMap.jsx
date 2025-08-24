// TerritoryMap.jsx
import { useState, useEffect, useRef } from "react";
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
import { normalizeLaunchToLatLng } from "../utils/coordinateUtils";

const LAUNCH_ZONES = [
  { id: "pakistan-north", polygon: [[35.0, 74.5],[34.0, 74.0],[33.5, 73.5],[33.5, 74.5]], color: "rgba(255,0,0,0.3)" },
  { id: "pakistan-south", polygon: [[25.5, 67.5],[25.0, 67.0],[24.5, 67.0],[24.5, 67.5]], color: "rgba(255,50,50,0.3)" },
  { id: "arabian-sea", polygon: [[22.0, 65.5],[20.0, 65.5],[18.0, 67.0],[18.0, 69.0],[22.0, 69.0]], color: "rgba(255,100,0,0.25)" },
  { id: "bay-of-bengal", polygon: [[17.0, 87.0],[15.0, 87.0],[13.0, 89.0],[14.0, 91.0],[17.0, 89.0]], color: "rgba(255,0,200,0.25)" },
  { id: "indian-ocean", polygon: [[10.0, 72.0],[7.0, 72.0],[6.0, 74.0],[7.0, 76.0],[10.0, 75.0]], color: "rgba(255,0,100,0.2)" },
];

// Utility to guarantee non-zero velocity
function calculateVelocity(startLat, startLng, targetLat, targetLng, speed = 0.05) {
  let dx = targetLng - startLng;
  let dy = targetLat - startLat;
  let dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.0001) {
    const angle = Math.random() * 2 * Math.PI;
    dx = Math.cos(angle) * 0.001;
    dy = Math.sin(angle) * 0.001;
    dist = 0.001;
  }

  return {
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
  };
}

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
  const showMessageRef = useRef(null);
  const [floatingMessages, showMessage] = useFloatingMessages();
  useEffect(() => { showMessageRef.current = showMessage; }, [showMessage]);

  const [globalObjects, setGlobalObjects] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const spawnedMissiles = useRef(new Set());
  const [activeInterceptors, setActiveInterceptors] = useState([]);

  // 🔹 Keep ref synced with latest globalObjects for interceptor updates
  const globalObjectsRef = useRef(globalObjects);
  useEffect(() => {
    globalObjectsRef.current = globalObjects;
  }, [globalObjects]);

  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({
    mapInstance, baseData: BASES, mapSize,
  });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);

  // Generate base units
  useEffect(() => {
    if (!pixelPositions || typeof pixelPositions !== "object" || Object.keys(pixelPositions).length === 0) {
      console.warn("⚠️ pixelPositions is invalid:", pixelPositions);
      return;
    }
    const generateUnitsForBase = (baseId) => {
      const baseData = BASES.find((b) => b.id === baseId);
      if (!baseData) return [];
      return Array.from({ length: 4 }).flatMap((_, i) => {
        const subBaseId = `${baseId}-sub${i + 1}`;
        const localUnits = generateBaseUnits(subBaseId, baseData.type, 60);
        return localUnits.map((u) => ({ ...u, localX: u.x, localY: u.y }));
      });
    };
    const allUnits = focusMode && selectedBaseId
      ? generateUnitsForBase(selectedBaseId)
      : BASES.flatMap((base) => generateUnitsForBase(base.id));

    setGlobalObjects((prev) => [
      ...prev.filter((o) => o.type === "missile" || o.type === "interceptor"),
      ...allUnits,
    ]);
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);

  // Add new missiles with guaranteed velocity
  useEffect(() => {
    if (!newMissile || spawnedMissiles.current.has(newMissile.id)) return;
    const { vx, vy } = calculateVelocity(
      newMissile.startLat, newMissile.startLng,
      newMissile.targetLat, newMissile.targetLng,
      0.05
    );

    const missileObj = {
      id: newMissile.id,
      type: "missile",
      lat: newMissile.startLat,
      lng: newMissile.startLng,
      targetLat: newMissile.targetLat,
      targetLng: newMissile.targetLng,
      baseId: newMissile.baseId,
      speed: 0.05,
      vx,
      vy,
      exploded: false,
    };

    console.log(`[Missile Init] Missile ${newMissile.id} -> vx: ${vx}, vy: ${vy}`);
    setGlobalObjects((prev) => [...prev, missileObj]);
    spawnedMissiles.current.add(newMissile.id);
  }, [newMissile]);

  // Animate missiles & interceptors
 useEffect(() => {
  const interval = setInterval(() => {
    // Move missiles
    setGlobalObjects((prev) =>
      prev.map((obj) => {
        if (obj.type === "missile" && !obj.exploded) {
          const dx = obj.targetLng - obj.lng;
          const dy = obj.targetLat - obj.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.001) return { ...obj, reached: true };

          return { ...obj, lat: obj.lat + obj.vy, lng: obj.lng + obj.vx };
        }
        return obj;
      })
    );

    // Move interceptors (use latest missiles from ref)
    setActiveInterceptors((prevInterceptors) =>
      prevInterceptors.map((intc) => {
        if (intc.exploded || intc.reached) return intc;

        const targetMissile = globalObjectsRef.current.find(
          (o) => o.type === "missile" && o.id === intc.targetId && !o.exploded
        );
        if (!targetMissile) return { ...intc, exploded: true };

        const { vx, vy } = calculateVelocity(
          intc.lat, intc.lng,
          targetMissile.lat, targetMissile.lng,
          intc.speed
        );

        const dx = targetMissile.lng - intc.lng;
        const dy = targetMissile.lat - intc.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // --- ADD THIS BLOCK ---
         if (dist < 0.05) {
          // Place explosion visually on the map
          if (mapInstance) {
            const point = mapInstance.latLngToContainerPoint([
              targetMissile.lat,
              targetMissile.lng,
            ]);
            setExplosions((prev) => [
              ...prev,
              { x: point.x, y: point.y },
            ]);
          }
          // Mark both as exploded
          setGlobalObjects((prev) =>
            prev.map((obj) =>
              obj.id === targetMissile.id ? { ...obj, exploded: true } : obj
            )
          );
          return { ...intc, exploded: true };
        }

        return { ...intc, vx, vy, lat: intc.lat + vy, lng: intc.lng + vx };
      })
    );
  }, 30);

  return () => clearInterval(interval);
}, []);


  const baseUnitsToScale = globalObjects.filter((o) => o.type !== "missile" && o.type !== "interceptor");
  const scaledBaseUnits = useSubBaseUnits(baseUnitsToScale, konvaZoom);

  // Convert missiles to pixel positions for drawing
  const missilesInPixels = globalObjects
    .filter((o) => o.type === "missile" && !o.exploded)
    .map((obj) => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0 };
    })
    .filter(Boolean);

  // Convert interceptors to pixel positions for drawing
  const interceptorsInPixels = activeInterceptors
    .filter((o) => o.type === "interceptor" && !o.exploded)
    .map((obj) => {
      if (!mapInstance || obj.lat == null || obj.lng == null) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0 };
    })
    .filter(Boolean);

  const allUnitsForCanvas = [...scaledBaseUnits, ...missilesInPixels, ...interceptorsInPixels];

  useCentralAI(
    allUnitsForCanvas,
    () => {},
    (signal) => socket.emit("unit-signal", signal),
    showMessageRef.current
  );

  return (
    <>
      {mapInstance &&
        BASES.map((base) => (
          <Marker
            key={base.id}
            position={base.coords}
            icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
            eventHandlers={{
              click: () => {
                setFocusMode(true);
                setSelectedBaseId(base.id);
                mapInstance.flyTo(base.coords, 15);
              },
            }}
          />
        ))}

      {LAUNCH_ZONES.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.polygon}
          pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.3 }}
        />
      ))}

      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 400, pointerEvents: "none" }}>
        {mapInstance && mapSize.width && mapSize.height && (
          <GridCanvas
            width={mapSize.width}
            height={mapSize.height}
            explosions={explosions}
            setExplosions={setExplosions}
            objects={allUnitsForCanvas}
            jammerReports={jammerReports}
            setJammerReports={setJammerReports}
            currentFrequency={currentFrequency}
            setCurrentFrequency={setCurrentFrequency}
            availableFrequencies={availableFrequencies}
            focusMode={focusMode}
            baseZones={smoothBasePositions}
            zoom={konvaZoom}
            selectedBaseId={selectedBaseId}
            floatingMessages={floatingMessages}
            onLaunchInterceptor={(launchData) => {
              const norm = normalizeLaunchToLatLng(launchData, mapInstance);
              if (!norm) return;

              console.log("[LAUNCH] raw:", launchData);
              console.log("[LAUNCH] normalized:", norm);
              console.log(
                "[MISSILES] count:",
                globalObjectsRef.current.filter((o) => o.type === "missile").length
              );

              const { vx, vy } = calculateVelocity(
                norm.launcherLat, norm.launcherLng,
                norm.targetLat, norm.targetLng,
                0.08
              );

              setActiveInterceptors((prev) => [
                ...prev,
                {
                  id: `interceptor-${Date.now()}`,
                  threatId: norm.threatId,
                  type: "interceptor",
                  lat: norm.launcherLat,
                  lng: norm.launcherLng,
                  targetId: norm.threatId,
                  speed: 0.08,
                  vx,
                  vy,
                  exploded: false,
                  reached: false,
                },
              ]);

              console.log("[INTERCEPTORS] after push:", activeInterceptors.length + 1);
            }}
            onLogsUpdate={onLogsUpdate}
            mapInstance={mapInstance}
          />
        )}
      </div>
    </>
  );
}
