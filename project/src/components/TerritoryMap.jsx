import { useState, useEffect, useRef } from "react";
import GridCanvas from "./MapSimulatuion/GridCanvas";
import { useSDR } from "../hooks/SDRContext";
import { generateBaseUnits } from "../hooks/GenerateBaseUnits";
import socket from "./socket";
import { BASES } from "../constants/baseData";
import { useCentralAI } from "../hooks/useCentralAI";
import useFloatingMessages from "../hooks/useFloatingMessages";
import { useLeafletToKonvaTransform } from "../hooks/useLeafletToKonvaTransform";
import { useSmoothPositions } from "../hooks/useSmoothPositions";

import { getStyledBaseIcon } from "../utils/transparentIcon";
import { Marker } from "react-leaflet";

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
}) {
  // ✅ SDR Context
  const {
    jammerReports,
    setJammerReports,
    currentFrequency,
    setCurrentFrequency,
    availableFrequencies,
  } = useSDR();

  // ✅ Local States
  const [floatingMessages, showMessage] = useFloatingMessages();
  const [globalObjects, setGlobalObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const spawnedMissiles = useRef(new Set());

  // ✅ Marker Click → Focus on Base
  const handleBaseClick = (base) => {
    setFocusMode(true);
    setSelectedBaseId(base.id);
    if (mapInstance) {
      mapInstance.flyTo(base.coords, 15, { animate: true, duration: 1.5 });
    }
  };

  // ✅ Convert lat/lng → Konva pixel positions
  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({
    mapInstance,
    baseData: BASES,
    mapSize,
  });

  // ✅ Smooth positions for animation
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);

// 🔹 Utility: Generate units for a base
const generateUnitsForBase = (baseId) => {
  const pos = pixelPositions[baseId];
  if (!pos) return [];

  // ✅ Invert logic: higher zoom → larger spacing
  const spacing = konvaZoom >= 15 
    ? 300 
    : konvaZoom >= 13 
    ? 200 
    : 120;

  const baseData = BASES.find((b) => b.id === baseId);
  const baseWithPos = { ...baseData, position: pos };

  return generateBaseUnits(baseWithPos, spacing).map((u) => ({
    ...u,
    baseId: baseId,
  }));
};


  // 1️⃣ Initialize Base Units (Overview or Focus)
  useEffect(() => {
    if (!pixelPositions || Object.keys(pixelPositions).length === 0) return;

    if (focusMode && selectedBaseId) {
      // Only generate selected base units
      const selectedUnits = generateUnitsForBase(selectedBaseId);
      setGlobalObjects((prev) => [
        ...prev.filter((o) => o.type === "missile" || o.type === "interceptor"),
        ...selectedUnits,
      ]);
    } else {
      // Overview → All bases visible
      const allUnits = BASES.flatMap((base) => generateUnitsForBase(base.id));
      setGlobalObjects((prev) => [
        ...prev.filter((o) => o.type === "missile" || o.type === "interceptor"),
        ...allUnits,
      ]);
    }
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);

  // 2️⃣ Handle New Missile Spawn
  useEffect(() => {
    if (!newMissile || spawnedMissiles.current.has(newMissile.id)) return;

    const missileObj = {
      id: newMissile.id,
      type: "missile",
      x: newMissile.startPosition.x,
      y: newMissile.startPosition.y,
      targetX: newMissile.targetPosition.x,
      targetY: newMissile.targetPosition.y,
      baseId: newMissile.baseId,
      speed: 2,
    };

    setGlobalObjects((prev) => [...prev, missileObj]);
    spawnedMissiles.current.add(newMissile.id);

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "TerritoryMap",
      type: "spawn",
      payload: missileObj,
      message: `Missile ${missileObj.id} spawned at base ${missileObj.baseId}`,
    });
  }, [newMissile]);

  // 3️⃣ Central AI
  useCentralAI(
    globalObjects,
    (log) => {
      onLogsUpdate?.({
        timestamp: new Date().toLocaleTimeString(),
        source: "CentralAI",
        type: log.action,
        payload: log,
        message: `CentralAI decided to ${log.action} missile ${log.missileId} using ${log.targetUnit}`,
      });
    },
    (signal) => {
      socket.emit("unit-signal", signal);
      console.log("📡 CentralAI emitted signal to unit:", signal);
    },
    showMessage
  );

  // 4️⃣ Determine visible objects & base zones
  const visibleObjects =
    focusMode && selectedBaseId
      ? globalObjects.filter(
          (obj) =>
            obj.baseId === selectedBaseId ||
            obj.type === "missile" ||
            obj.type === "interceptor"
        )
      : globalObjects;

  const focusBaseZones =
    focusMode && selectedBaseId
      ? { [selectedBaseId]: smoothBasePositions[selectedBaseId] }
      : smoothBasePositions;

  return (
    <div
      className="absolute inset-0 w-full h-full z-[1000]"
      style={{ pointerEvents: focusMode ? "auto" : "none" }}
    >
      {/* 🎛 Focus Controls */}
      <div className="absolute top-4 left-4 z-50 p-2 bg-white rounded shadow pointer-events-auto">
        <button
          onClick={() => setFocusMode((prev) => !prev)}
          className="mr-2 px-2 py-1 border rounded"
        >
          {focusMode ? "🔍 Focus Mode ON" : "🌍 Overview Mode"}
        </button>
        <select
          value={selectedBaseId || ""}
          onChange={(e) => setSelectedBaseId(e.target.value)}
          disabled={!focusMode}
          className="px-2 py-1 border rounded"
        >
          <option value="">-- Select Base --</option>
          {BASES.map((base) => (
            <option key={base.id} value={base.id}>
              {base.id}
            </option>
          ))}
        </select>
      </div>

      {/* 🟢 Leaflet Base Markers */}
      {mapInstance &&
        BASES.map((base) => (
          <Marker
            key={base.id}
            position={base.coords} // [lat, lng]
            icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
            eventHandlers={{
              click: () => handleBaseClick(base),
            }}
          />
        ))}

      {/* 🎨 Konva Canvas */}
      <GridCanvas
        width={mapSize.width}
        height={mapSize.height}
        explosions={explosions}
        setExplosions={setExplosions}
        objects={visibleObjects}
        incomingSignals={incomingSignals}
        setIncomingSignals={setIncomingSignals}
        jammerReports={jammerReports}
        onLaunchInterceptor={() => {}}
        setJammerReports={setJammerReports}
        currentFrequency={currentFrequency}
        setCurrentFrequency={setCurrentFrequency}
        availableFrequencies={availableFrequencies}
        focusMode={focusMode}
        baseZones={focusBaseZones} // ✅ Only show focused base zones
        zoom={konvaZoom}
        center={center}
        selectedBaseId={selectedBaseId}
        floatingMessages={floatingMessages}
        onBaseClick={() => {}}
      />
    </div>
  );
}
