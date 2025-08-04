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

const LAUNCH_ZONES = [
  {
    id: "pakistan-north",
    polygon: [
      [35.0, 74.5],
      [34.0, 74.0],
      [33.5, 73.5],
      [33.5, 74.5],
    ],
    color: "rgba(255,0,0,0.3)",
  },
  {
    id: "pakistan-south",
    polygon: [
      [25.5, 67.5],
      [25.0, 67.0],
      [24.5, 67.0],
      [24.5, 67.5],
    ],
    color: "rgba(255,50,50,0.3)",
  },
  {
    id: "arabian-sea",
    polygon: [
      [22.0, 65.5],
      [20.0, 65.5],
      [18.0, 67.0],
      [18.0, 69.0],
      [22.0, 69.0],
    ],
    color: "rgba(255,100,0,0.25)",
  },
  {
    id: "bay-of-bengal",
    polygon: [
      [17.0, 87.0],
      [15.0, 87.0],
      [13.0, 89.0],
      [14.0, 91.0],
      [17.0, 89.0],
    ],
    color: "rgba(255,0,200,0.25)",
  },
  {
    id: "indian-ocean",
    polygon: [
      [10.0, 72.0],
      [7.0, 72.0],
      [6.0, 74.0],
      [7.0, 76.0],
      [10.0, 75.0],
    ],
    color: "rgba(255,0,100,0.2)",
  },
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
  selectedBaseId, setSelectedBaseId,
}) {
  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  const [floatingMessages, showMessage] = useFloatingMessages();
  const [globalObjects, setGlobalObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]);
  const [explosions, setExplosions] = useState([]);

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
      speed: 0.05,
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

  // 3️⃣ Animate Missiles in Lat/Lng
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalObjects((prev) =>
        prev.map((obj) => {
          if (obj.type !== "missile" || obj.exploded) return obj;

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
        })
      );
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // 4️⃣ Handle Explosions
  useEffect(() => {
    globalObjects.forEach((obj) => {
      if (obj.type === "missile" && obj.reached && !obj.exploded) {
        const point = mapInstance?.latLngToContainerPoint([obj.lat, obj.lng]);
        if (point) setExplosions((prev) => [...prev, { x: point.x, y: point.y }]);

        setGlobalObjects((prev) =>
          prev.map((m) =>
            m.id === obj.id ? { ...m, exploded: true } : m
          )
        );
      }
    });
  }, [globalObjects]);

  // 5️⃣ Central AI
  useCentralAI(
    globalObjects,
    (log) => {
      onLogsUpdate?.({
        timestamp: new Date().toLocaleTimeString(),
        source: "CentralAI",
        type: log.action,
        message: `CentralAI decided to ${log.action} missile ${log.missileId} using ${log.targetUnit}`,
        payload: log,
      });
    },
    (signal) => socket.emit("unit-signal", signal),
    showMessage
  );

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

  // 🔹 Convert missiles to pixel coordinates
  const missilesInPixels = visibleObjects
    .filter((o) => o.type === "missile" && !o.exploded)
    .map((obj) => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point.x, y: point.y };
    })
    .filter(Boolean);

  const baseUnitsLocal = visibleObjects.filter(
    (o) => o.type !== "missile" && o.type !== "interceptor"
  );
  const scaledBaseUnits = useSubBaseUnits(baseUnitsLocal, konvaZoom);

  // 🔹 Base Marker Click
  const handleBaseClick = (base) => {
    setFocusMode(true);
    setSelectedBaseId(base.id);
    if (mapInstance) {
      mapInstance.flyTo(base.coords, 15, { animate: true, duration: 1.5 });
    }
  };

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
      {mapInstance &&
  BASES.map((base) => (
    <Marker
      key={base.id}
      position={base.coords}
      icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
      eventHandlers={{
        click: () => {
          if (!mapInstance) return;
          setFocusMode(true);
          setSelectedBaseId(base.id);
          mapInstance.flyTo(base.coords, 15, { animate: true, duration: 1.5 });
        },
      }}
    />
  ))
}


      {/* 🎨 Konva Canvas Overlay */}
      <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 450 }}>
        <GridCanvas
          width={mapSize.width}
           style={{ pointerEvents: "none" }} 
          height={mapSize.height}
          explosions={explosions}
          setExplosions={setExplosions}
          objects={[...scaledBaseUnits, ...missilesInPixels]}
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
    </>
  );
}
