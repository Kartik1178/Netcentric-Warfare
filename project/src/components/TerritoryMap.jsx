// In TerritoryMap.js

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
console.log('Territory')
  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  const [floatingMessages, showMessage] = useFloatingMessages();
  
  // ✅ --- REFACTORED STATE ---
  const [baseUnits, setBaseUnits] = useState([]);
  const [missiles, setMissiles] = useState([]);
  const [interceptors, setInterceptors] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [allUnits, setAllUnits] = useState([]); // Single source of truth for the canvas
  
  const spawnedMissiles = useRef(new Set());
  const showMessageRef = useRef(null);
   useEffect(() => {
    showMessageRef.current = showMessage;
  }, [showMessage]);


  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({ mapInstance, baseData: BASES, mapSize });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);

  // --- EFFECT #1: Generate Base Units when map changes ---
  useEffect(() => {
    if (!pixelPositions || Object.keys(pixelPositions).length === 0) return;

    const generateUnitsForBase = (baseId) => {
        const baseData = BASES.find((b) => b.id === baseId);
        if (!baseData) return [];
        return Array.from({ length: 4 }).flatMap((_, i) => {
            const subBaseId = `${baseId}-sub${i + 1}`;
            const localUnits = generateBaseUnits(subBaseId, baseData.type, 60);
            return localUnits.map((u) => ({ ...u, localX: u.x, localY: u.y }));
        });
    };

    const allGeneratedUnits = focusMode && selectedBaseId
      ? generateUnitsForBase(selectedBaseId)
      : BASES.flatMap((base) => generateUnitsForBase(base.id));
      
    setBaseUnits(allGeneratedUnits);

  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);


  // --- EFFECT #2: Add new missiles ---
  useEffect(() => {
    if (!newMissile || spawnedMissiles.current.has(newMissile.id)) return;
    
    const missileObj = {
      id: newMissile.id, type: "missile", lat: newMissile.startLat, lng: newMissile.startLng,
      targetLat: newMissile.targetLat, targetLng: newMissile.targetLng, baseId: newMissile.baseId,
      speed: 0.05, exploded: false,
    };

    setMissiles(prev => [...prev, missileObj]);
    spawnedMissiles.current.add(newMissile.id);
    onLogsUpdate?.({ /* ... log data ... */ });

  }, [newMissile, onLogsUpdate]);
  
  // --- EFFECT #3: The MAIN Animation and State Combining Loop ---
  useEffect(() => {
    const animationInterval = setInterval(() => {
        // 1. Update missile positions (lat/lng)
        setMissiles(prevMissiles => prevMissiles.map(m => {
            if (m.exploded || m.reached) return m;
            const dx = m.targetLng - m.lng;
            const dy = m.targetLat - m.lat;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.001) return { ...m, reached: true };
            return { ...m, lat: m.lat + (dy / dist) * m.speed, lng: m.lng + (dx / dist) * m.speed };
        }));

        // 2. Update interceptor positions (pixels)
        setInterceptors(prevInterceptors => prevInterceptors.map(i => {
            if (i.exploded || i.reached) return i;
            const dx = i.targetX - i.x;
            const dy = i.targetY - i.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 5) return { ...i, reached: true };
            return { ...i, x: i.x + (dx / dist) * i.speed, y: i.y + (dy / dist) * i.speed };
        }));

        // 3. COMBINE ALL DATA INTO A SINGLE ARRAY FOR THE CANVAS
        if (mapInstance && Object.keys(smoothBasePositions).length > 0) {
            const subBaseSpacing = konvaZoom >= 15 ? 300 : konvaZoom >= 13 ? 200 : 120;
            const subBaseOffsets = [[0, -subBaseSpacing], [subBaseSpacing, 0], [0, subBaseSpacing], [-subBaseSpacing, 0]];

            const globallyPositionedBaseUnits = baseUnits.map(unit => {
                const mainBaseId = unit.baseId.replace(/-sub[1-4]$/, '');
                const basePixelPos = smoothBasePositions[mainBaseId];
                if (!basePixelPos) return null;
                const subBaseIndexMatch = unit.baseId.match(/sub(\d+)/);
                const subBaseIndex = subBaseIndexMatch ? parseInt(subBaseIndexMatch[1]) - 1 : 0;
                const [subOffsetX, subOffsetY] = subBaseOffsets[subBaseIndex] || [0, 0];
                return { ...unit, x: basePixelPos.x + subOffsetX + unit.localX, y: basePixelPos.y + subOffsetY + unit.localY };
            }).filter(Boolean);

            const missilesInPixels = missiles.map(m => {
                const point = mapInstance.latLngToContainerPoint([m.lat, m.lng]);
                return { ...m, x: point.x, y: point.y };
            });

            setAllUnits([...globallyPositionedBaseUnits, ...missilesInPixels, ...interceptors]);
        }
    }, 30);

    return () => clearInterval(animationInterval);
  }, [baseUnits, missiles, interceptors, mapInstance, smoothBasePositions, konvaZoom]); // Re-run when any source data changes


  // Pass the single, combined state to Central AI
  useCentralAI(allUnits, () => {}, (signal) => socket.emit("unit-signal", signal), showMessageRef.current);

  // ... (Collision detection and other logic can remain, but should use the separate states: `missiles`, `interceptors`)

  return (
    <>
      {/* ... Leaflet Markers and Polygons ... */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 400, pointerEvents: "none" }}>
        <GridCanvas
          width={mapSize.width}
          height={mapSize.height}
          explosions={explosions}
          setExplosions={setExplosions}
          objects={allUnits} // ✅ PASS THE SINGLE SOURCE OF TRUTH
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
          onLaunchInterceptor={ (launchData) => setInterceptors(prev => [...prev, {id: `interceptor-${Date.now()}`, ...launchData, speed: 25}]) }
          onLogsUpdate={onLogsUpdate}
          mapInstance={mapInstance}
        />
      </div>
    </>
  );
}
