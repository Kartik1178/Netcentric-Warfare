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
 
  const showMessageRef = useRef(null);
  const [floatingMessages, showMessage] = useFloatingMessages();
  useEffect(() => {
    showMessageRef.current = showMessage;
  }, [showMessage]);

  const [globalObjects, setGlobalObjects] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const spawnedMissiles = useRef(new Set());
  const [activeInterceptors, setActiveInterceptors] = useState([]);

  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({
    mapInstance,
    baseData: BASES,
    mapSize,
  });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);

  // Effect to generate base units
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
    const allUnits = focusMode && selectedBaseId ? generateUnitsForBase(selectedBaseId) : BASES.flatMap((base) => generateUnitsForBase(base.id));
    setGlobalObjects((prev) => [
      ...prev.filter((o) => o.type === "missile" || o.type === "interceptor"),
      ...allUnits,
    ]);
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);

  // Effect to add new missiles
  useEffect(() => {
    if (!newMissile || spawnedMissiles.current.has(newMissile.id)) return;
    const missileObj = {
      id: newMissile.id, type: "missile", lat: newMissile.startLat, lng: newMissile.startLng,
      targetLat: newMissile.targetLat, targetLng: newMissile.targetLng, baseId: newMissile.baseId,
      speed: 0.05, exploded: false,
    };
    setGlobalObjects((prev) => [...prev, missileObj]);
    spawnedMissiles.current.add(newMissile.id);
  }, [newMissile]);

  // Animation and Position Update Effect
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setGlobalObjects((prevGlobalObjects) => 
        prevGlobalObjects.map((obj) => {
          if (obj.type === "missile" && !obj.exploded) {
            const dx = obj.targetLng - obj.lng;
            const dy = obj.targetLat - obj.lat;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.001) return { ...obj, reached: true };
            return { ...obj, lat: obj.lat + (dy / dist) * obj.speed, lng: obj.lng + (dx / dist) * obj.speed };
          }
          return obj;
        })
      );
      setActiveInterceptors((prev) => 
        prev.map((intc) => {
          if (intc.exploded || intc.reached) return intc;
          const dx = intc.targetX - intc.x;
          const dy = intc.targetY - intc.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) return { ...intc, reached: true };
          return { ...intc, x: intc.x + (dx / dist) * intc.speed, y: intc.y + (dy / dist) * intc.speed };
        })
      );
    }, 30);
    return () => clearInterval(animationInterval);
  }, []);

  // --- DERIVED STATE: Calculated on every render to ensure freshness ---
  const baseUnitsToScale = globalObjects.filter((o) => o.type !== "missile" && o.type !== "interceptor");
  const scaledBaseUnits = useSubBaseUnits(baseUnitsToScale, konvaZoom);
  
  const missilesInPixels = globalObjects
    .filter((o) => o.type === "missile" && !o.exploded)
    .map((obj) => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0 };
    })
    .filter(Boolean);

  const interceptorsInPixels = activeInterceptors
    .filter((o) => o.type === "interceptor" && !o.exploded);

  // This is the final, correct array of all objects with their current pixel positions
  const allUnitsForCanvas = [...scaledBaseUnits, ...missilesInPixels, ...interceptorsInPixels];

  useCentralAI(allUnitsForCanvas, () => {}, (signal) => socket.emit("unit-signal", signal), showMessageRef.current);

  // ... (Your other useEffects for collision, impact, etc. can remain the same)

  return (
    <>
      {/* Leaflet Markers and Polygons */}
      {mapInstance && BASES.map((base) => (
        <Marker key={base.id} position={base.coords} icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
          eventHandlers={{ click: () => { setFocusMode(true); setSelectedBaseId(base.id); mapInstance.flyTo(base.coords, 15); }}}
        />
      ))}
      {LAUNCH_ZONES.map((zone) => (
        <Polygon key={zone.id} positions={zone.polygon} pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.3 }} />
      ))}
      
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 400, pointerEvents: "none" }}>
        <GridCanvas
          width={mapSize.width} height={mapSize.height} explosions={explosions} setExplosions={setExplosions}
          objects={allUnitsForCanvas} // ✅ PASS THE CORRECT, FRESHLY CALCULATED DATA
          jammerReports={jammerReports} setJammerReports={setJammerReports} currentFrequency={currentFrequency}
          setCurrentFrequency={setCurrentFrequency} availableFrequencies={availableFrequencies} focusMode={focusMode}
          baseZones={smoothBasePositions} zoom={konvaZoom} selectedBaseId={selectedBaseId} floatingMessages={floatingMessages}
          onLaunchInterceptor={(launchData) => setActiveInterceptors(prev => [...prev, {id: `interceptor-${Date.now()}`, ...launchData, speed: 25}])}
          onLogsUpdate={onLogsUpdate} mapInstance={mapInstance}
        />
      </div>
    </>
  );
}
