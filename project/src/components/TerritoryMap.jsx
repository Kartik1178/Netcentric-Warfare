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
  { id: "pakistan-north", polygon: [[35,74.5],[34,74],[33.5,73.5],[33.5,74.5]], color: "rgba(255,0,0,0.3)" },
  // ... (same as earlier)
];

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
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

export default function TerritoryMap(props) {
  const {
    onLogsUpdate,
    newMissile, setNewMissile,
    newDrone, setNewDrone,
    newArtillery, setNewArtillery,
    newJammer, setNewJammer,
    zoom, center, mapInstance, mapSize,
    focusMode, selectedBaseId
  } = props;

  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  const [floatingMessages, showMessage] = useFloatingMessages();
  const showMessageRef = useRef(null);
  useEffect(() => { showMessageRef.current = showMessage; }, [showMessage]);

  const [globalObjects, setGlobalObjects] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const spawnedObjects = useRef(new Set());
  const [activeInterceptors, setActiveInterceptors] = useState([]);
  const globalObjectsRef = useRef(globalObjects);
  useEffect(() => { globalObjectsRef.current = globalObjects; }, [globalObjects]);

  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({ mapInstance, baseData: BASES, mapSize });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);

  const VELOCITY_BY_TYPE = { missile: 0.05, drone: 0.02, artillery: 0.015 };

  // Clear old transient/threat objects on mount
  useEffect(() => {
    spawnedObjects.current.clear();
    setGlobalObjects(prev => prev.filter(o => !["jammer","missile","drone","artillery"].includes(o.type)));
  }, []);

  // Generate base units (unchanged)
  useEffect(() => {
    if (!pixelPositions || Object.keys(pixelPositions).length === 0) return;

    const generateUnitsForBase = (baseId) => {
      const baseData = BASES.find(b => b.id === baseId);
      if (!baseData) return [];
      const dynamicRadius = konvaZoom >= 15 ? 80 : konvaZoom >= 13 ? 70 : 60;

      return Array.from({ length: 4 }).flatMap((_, i) => {
        const subBaseId = `${baseId}-sub${i + 1}`;
        const localUnits = generateBaseUnits(subBaseId, baseData.type, dynamicRadius);
        return localUnits.map(u => ({ ...u, localX: u.x, localY: u.y }));
      });
    };

    const allUnits = selectedBaseId
      ? generateUnitsForBase(selectedBaseId)
      : BASES.flatMap(b => generateUnitsForBase(b.id));

    setGlobalObjects(prev => [
      ...prev.filter(o => ["missile","drone","artillery","interceptor","jammer"].includes(o.type)),
      ...allUnits
    ]);
  }, [pixelPositions, konvaZoom, selectedBaseId]);

  // --- Spawn new objects: unified logic for missile & jammer (and others) ---
  useEffect(() => {
    const candidates = [
      { data: newMissile, setter: setNewMissile },
      { data: newDrone, setter: setNewDrone },
      { data: newArtillery, setter: setNewArtillery },
      { data: newJammer, setter: setNewJammer },
    ];

    candidates.forEach(item => {
      const objData = item.data;
      if (!objData) return;

      // Normalize id
      const id = objData.id || `${objData.type || 'obj'}-${Date.now()}`;

      if (spawnedObjects.current.has(id)) {
        // already spawned — clear transient and skip
        item.setter?.(null);
        return;
      }

      // JAMMER: store as static threat with lat/lng (no early pixel projection required)
      if (objData.type === "jammer") {
        const lat = objData.startLat ?? objData.lat;
        const lng = objData.startLng ?? objData.lng;
        // fallback guard
        if (typeof lat !== "number" || typeof lng !== "number") {
          console.warn("[TerritoryMap] jammer missing startLat/startLng:", objData);
          item.setter?.(null);
          return;
        }

        setGlobalObjects(prev => [...prev, {
          id,
          type: "jammer",
          lat,
          lng,
          radius: objData.radius ?? objData.r ?? 100,
          baseId: objData.baseId,
          threat: true,
          exploded: false
        }]);

        spawnedObjects.current.add(id);
        onLogsUpdate?.({ type: "jammer-spawn", id, baseId: objData.baseId });
        // clear transient so it doesn't persist across reload
        item.setter?.(null);
        return;
      }

      // MISSILE / DRONE / ARTILLERY (dynamic) — compute vx/vy and push
      const speed = VELOCITY_BY_TYPE[objData.type] || 0.05;
      const sLat = objData.startLat ?? objData.lat;
      const sLng = objData.startLng ?? objData.lng;
      const tLat = objData.targetLat ?? objData.targetLat ?? objData.target?.lat;
      const tLng = objData.targetLng ?? objData.targetLng ?? objData.target?.lng;

      if (typeof sLat !== "number" || typeof sLng !== "number" || typeof tLat !== "number" || typeof tLng !== "number") {
        console.warn("[TerritoryMap] spawn missing coords:", objData);
        item.setter?.(null);
        return;
      }

      const { vx, vy } = calculateVelocity(sLat, sLng, tLat, tLng, speed);

      setGlobalObjects(prev => [...prev, {
        id,
        type: objData.type || "missile",
        lat: sLat,
        lng: sLng,
        targetLat: tLat,
        targetLng: tLng,
        baseId: objData.baseId,
        speed,
        vx,
        vy,
        exploded: false
      }]);

      spawnedObjects.current.add(id);
      onLogsUpdate?.({ type: `${objData.type}-spawn`, id, baseId: objData.baseId });
      // clear the transient input
      item.setter?.(null);
    });

    // we depend on the transient props and mapInstance (mapInstance used later for projections)
  }, [newMissile, newDrone, newArtillery, newJammer, mapInstance]);

  // --- Animate objects & interceptors (update lat/lng and rely on later projection to pixels) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalObjects(prev => prev.map(obj => {
        if (["missile","drone","artillery"].includes(obj.type) && !obj.exploded) {
          const newLat = obj.lat + obj.vy;
          const newLng = obj.lng + obj.vx;
          return { ...obj, lat: newLat, lng: newLng };
        }
        // jammer static — position updated in projection step
        return obj;
      }));

      // interceptors handling (unchanged)
      setActiveInterceptors(prev => prev.map(intc => {
        if (intc.exploded || intc.reached) return intc;
        const targetObj = globalObjectsRef.current.find(o => o.id === intc.targetId && !o.exploded);
        if (!targetObj) return { ...intc, exploded: true };

        const { vx, vy } = calculateVelocity(intc.lat, intc.lng, targetObj.lat, targetObj.lng, intc.speed);
        const dx = targetObj.lng - intc.lng;
        const dy = targetObj.lat - intc.lat;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 0.05) {
          if (mapInstance) {
            const point = mapInstance.latLngToContainerPoint([targetObj.lat, targetObj.lng]);
            setExplosions(prev => [...prev, { x: point.x, y: point.y }]);
          }
          setGlobalObjects(prev => prev.map(o => o.id === targetObj.id ? { ...o, exploded: true } : o));
          return { ...intc, exploded: true };
        }

        return { ...intc, vx, vy, lat: intc.lat + vy, lng: intc.lng + vx };
      }));
    }, 30);

    return () => clearInterval(interval);
  }, [mapInstance]);

  // --- Convert to pixel coords for Canvas: project dynamic threats and jammers the same way ---
  const baseUnitsToScale = globalObjects.filter(o => !["missile","drone","artillery","interceptor","jammer"].includes(o.type));
  const scaledBaseUnits = useSubBaseUnits(baseUnitsToScale, konvaZoom);

  const projectObjects = globalObjects
    .filter(o => ["missile","drone","artillery","jammer"].includes(o.type) && !o.exploded)
    .map(obj => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x ?? 0, y: point?.y ?? 0 };
    })
    .filter(Boolean);

  const interceptorsInPixels = activeInterceptors
    .filter(o => !o.exploded)
    .map(obj => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x ?? 0, y: point?.y ?? 0 };
    })
    .filter(Boolean);

  const allUnitsForCanvas = [...scaledBaseUnits, ...projectObjects, ...interceptorsInPixels];

  useCentralAI(allUnitsForCanvas, () => {}, signal => socket.emit("unit-signal", signal), showMessageRef.current);

  return (
    <>
      {mapInstance && BASES.map(base => (
        <Marker
          key={base.id}
          position={base.coords}
          icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
          eventHandlers={{ click: () => { /* handle click */ } }}
        />
      ))}

      {LAUNCH_ZONES.map(zone => (
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
            objects={allUnitsForCanvas}     // single source of truth for everything
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
              const { vx, vy } = calculateVelocity(norm.launcherLat, norm.launcherLng, norm.targetLat, norm.targetLng, 0.08);
              const interceptorId = `interceptor-${Date.now()}`;
              setActiveInterceptors(prev => [...prev, {
                id: interceptorId,
                threatId: norm.threatId,
                type: "interceptor",
                lat: norm.launcherLat,
                lng: norm.launcherLng,
                targetId: norm.threatId,
                speed: 0.08, vx, vy,
                exploded: false, reached: false
              }]);
            }}
            onLogsUpdate={onLogsUpdate}
            mapInstance={mapInstance}
          />
        )}
      </div>
    </>
  );
}
