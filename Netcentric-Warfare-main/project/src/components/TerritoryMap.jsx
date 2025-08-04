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
import { useSubBaseUnits } from "../hooks/useSubBaseUnits";
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
  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  const [floatingMessages, showMessage] = useFloatingMessages();
  const [globalObjects, setGlobalObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const spawnedMissiles = useRef(new Set());

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

  // 🔹 Handle base focus
  const handleBaseClick = (base) => {
    setFocusMode(true);
    setSelectedBaseId(base.id);
    if (mapInstance) {
      mapInstance.flyTo(base.coords, 15, { animate: true, duration: 1.5 });
    }
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

    const { startPosition, targetPosition } = newMissile;
    if (!startPosition || !targetPosition) return;

    const missileObj = {
      id: newMissile.id,
      type: "missile",
      x: startPosition.x,
      y: startPosition.y,
      targetX: targetPosition.x,
      targetY: targetPosition.y,
      baseId: newMissile.baseId,
      speed: 2,
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

// 4️⃣ Animate Missiles Towards Target
useEffect(() => {
  const interval = setInterval(() => {
    setGlobalObjects((prev) =>
      prev.map((obj) => {
        if (obj.type !== "missile") return obj; // Only move missiles

        const dx = obj.targetX - obj.x;
        const dy = obj.targetY - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // ✅ If missile reaches the target, stop moving
        if (dist < obj.speed) {
          return { ...obj, x: obj.targetX, y: obj.targetY, reached: true };
        }

        // ✅ Move missile toward target
        const nx = obj.x + (dx / dist) * obj.speed;
        const ny = obj.y + (dy / dist) * obj.speed;

        return { ...obj, x: nx, y: ny };
      })
    );
  }, 30); // Runs every 30ms (~33fps)

  return () => clearInterval(interval);
}, []);
useEffect(() => {
  globalObjects.forEach((obj, idx) => {
    if (obj.type === "missile" && obj.reached && !obj.exploded) {
      // ✅ Create explosion at missile location
      setExplosions((prev) => [...prev, { x: obj.x, y: obj.y }]);

      // ✅ Mark missile as exploded (so it disappears)
      setGlobalObjects((prev) =>
        prev.map((m) =>
          m.id === obj.id ? { ...m, exploded: true } : m
        )
      );
    }
  });
}, [globalObjects]);

  // 3️⃣ Central AI Decisions
  useCentralAI(globalObjects, (log) => {
    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "CentralAI",
      type: log.action,
      message: `CentralAI decided to ${log.action} missile ${log.missileId} using ${log.targetUnit}`,
      payload: log,
    });
  }, (signal) => {
    socket.emit("unit-signal", signal);
  }, showMessage);

  // 🔹 Determine visible objects in Focus Mode
  const visibleObjects =
    focusMode && selectedBaseId
      ? globalObjects.filter(
          (obj) =>
            obj.baseId === selectedBaseId ||
            obj.baseId?.startsWith(`${selectedBaseId}-sub`) ||
            obj.type === "missile" ||
            obj.type === "interceptor"
        )
      : globalObjects;

  const focusBaseZones =
    focusMode && selectedBaseId
      ? { [selectedBaseId]: smoothBasePositions[selectedBaseId] }
      : smoothBasePositions;

  // 🔹 Scale sub-base units for zoom
  const baseUnitsLocal = visibleObjects.filter((o) => o.type !== "missile" && o.type !== "interceptor");
  const scaledBaseUnits = useSubBaseUnits(baseUnitsLocal, konvaZoom);
return (
  <div className="absolute inset-0 w-full h-full pointer-events-none">
    <GridCanvas
      width={mapSize.width}
      height={mapSize.height}
      explosions={explosions}
      setExplosions={setExplosions}
      objects={[
        ...scaledBaseUnits,
        ...visibleObjects.filter((o) => o.type === "missile" || o.type === "interceptor"),
      ]}
      incomingSignals={incomingSignals}
      setIncomingSignals={setIncomingSignals}
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
    />
  </div>
);


}
