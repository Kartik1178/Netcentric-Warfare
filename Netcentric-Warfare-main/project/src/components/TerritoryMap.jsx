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
  { id: "pakistan-north", polygon: [[35,74.5],[34,74],[33.5,73.5],[33.5,74.5]], color: "rgba(255,0,0,0.3)" },
  { id: "pakistan-south", polygon: [[25.5,67.5],[25,67],[24.5,67],[24.5,67.5]], color: "rgba(255,50,50,0.3)" },
  { id: "arabian-sea", polygon: [[22,65.5],[20,65.5],[18,67],[18,69],[22,69]], color: "rgba(255,100,0,0.25)" },
  { id: "bay-of-bengal", polygon: [[17,87],[15,87],[13,89],[14,91],[17,89]], color: "rgba(255,0,200,0.25)" },
  { id: "indian-ocean", polygon: [[10,72],[7,72],[6,74],[7,76],[10,75]], color: "rgba(255,0,100,0.2)" },
];

function calculateVelocity(startLat, startLng, targetLat, targetLng, speed = 0.05) {
  const dx = targetLng - startLng;
  const dy = targetLat - startLat;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.001; // prevent divide by 0
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

export default function TerritoryMap(props) {
  const {
    onLogsUpdate, newMissile, newDrone, newArtillery,
    zoom, center, mapInstance, mapSize,
    focusMode, setFocusMode, selectedBaseId, setSelectedBaseId
  } = props;

  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  const showMessageRef = useRef(null);
  const [floatingMessages, showMessage] = useFloatingMessages();
  useEffect(() => { showMessageRef.current = showMessage; }, [showMessage]);

  const [globalObjects, setGlobalObjects] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const spawnedObjects = useRef(new Set());
  const [activeInterceptors, setActiveInterceptors] = useState([]);
  const globalObjectsRef = useRef(globalObjects);
  useEffect(() => { globalObjectsRef.current = globalObjects; }, [globalObjects]);

  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({ mapInstance, baseData: BASES, mapSize });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);
  const [localThreats, setLocalThreats] = useState({});
  const HANDOFF_DEG = 0.02; // ~2 km

  // Generate base units
  useEffect(() => {
    if (!pixelPositions || Object.keys(pixelPositions).length === 0) return;
    const generateUnitsForBase = (baseId) => {
      const baseData = BASES.find(b => b.id === baseId);
      if (!baseData) return [];
      const dynamicRadius = konvaZoom >= 15 ? 80 : konvaZoom >= 13 ? 70 : 60;
      return Array.from({ length: 4 }).flatMap((_, i) => {
        const subBaseId = `${baseId}-sub${i + 1}`;
        return generateBaseUnits(subBaseId, baseData.type, dynamicRadius).map(u => ({ ...u, localX: u.x, localY: u.y }));
      });
    };
    const allUnits = focusMode && selectedBaseId ? generateUnitsForBase(selectedBaseId) : BASES.flatMap(b => generateUnitsForBase(b.id));
    setGlobalObjects(prev => [
      ...prev.filter(o => ["missile","drone","artillery","interceptor"].includes(o.type)),
      ...allUnits
    ]);
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);

  const VELOCITY_BY_TYPE = { missile: 0.05, drone: 0.02, artillery: 0.015 };

  // Spawn new objects
  useEffect(() => {
    const newObjs = [newMissile, newDrone, newArtillery].filter(Boolean);
    newObjs.forEach(objData => {
      if (!objData || spawnedObjects.current.has(objData.id)) return;
      const speed = VELOCITY_BY_TYPE[objData.type] || 0.05;
      const { vx, vy } = calculateVelocity(objData.startLat, objData.startLng, objData.targetLat, objData.targetLng, speed);
      setGlobalObjects(prev => [...prev, {
        id: objData.id, type: objData.type,
        lat: objData.startLat, lng: objData.startLng,
        targetLat: objData.targetLat, targetLng: objData.targetLng,
        baseId: objData.baseId, speed, vx, vy, exploded: false
      }]);
      spawnedObjects.current.add(objData.id);
    });
  }, [newMissile, newDrone, newArtillery]);

  // Animate objects & interceptors
  // Animate objects & interceptors
useEffect(() => {
  const THRESHOLDS = { missile: 0.001, drone: 0.001, artillery: 0.001 };
  const SLOW_RADIUS = 0.5; // degrees (~2 km)

  const interval = setInterval(() => {
    setGlobalObjects(prev => {
      const next = [];
      const handoffList = [];

      for (const obj of prev) {
        if (!["missile", "drone", "artillery"].includes(obj.type) || obj.exploded || obj.reached) {
          next.push(obj);
          continue;
        }

        const dx = obj.targetLng - obj.lng;
        const dy = obj.targetLat - obj.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (THRESHOLDS[obj.type] || 0.001)) {
          next.push(obj.type === "missile"
            ? { ...obj, reached: true, exploded: true }
            : { ...obj, reached: true, vx: 0, vy: 0 });
          continue;
        }

        // Find nearest base
        let nearestBase = null;
        let minD = Infinity;
        for (const b of BASES) {
          const dLat = b.coords[0] - obj.lat;
          const dLng = b.coords[1] - obj.lng;
          const d = Math.sqrt(dLat * dLat + dLng * dLng);
          if (d < minD) { minD = d; nearestBase = b; }
        }

        // Apply slow-down factor when near base
        let speedFactor = 1;
        if (nearestBase && minD <= SLOW_RADIUS) {
          speedFactor = minD / SLOW_RADIUS; // slower when closer
        }

        // Handle handoff for localThreats
        if (nearestBase && minD <= HANDOFF_DEG && !obj.handedOff) {
          handoffList.push({ obj, baseId: nearestBase.id });
          next.push({ ...obj, vx: 0, vy: 0, handedOff: true }); // pause in handoff zone
          continue;
        }

        const { vx, vy } = calculateVelocity(obj.lat, obj.lng, obj.targetLat, obj.targetLng, obj.speed * speedFactor);
        next.push({ ...obj, lat: obj.lat + vy, lng: obj.lng + vx, vx, vy });
      }

      // Handoff to localThreats
      if (handoffList.length > 0 && mapInstance) {
        setLocalThreats(prev => {
          const nextLocal = { ...prev };
          handoffList.forEach(({ obj, baseId }) => {
            const pt = mapInstance.latLngToContainerPoint([obj.lat,obj.lng]);
            const basePixel = smoothBasePositions[baseId];
            if (!basePixel) return;
            const relX = pt.x - basePixel.x;
            const relY = pt.y - basePixel.y;
            const speedPx = (VELOCITY_BY_TYPE[obj.type] || 0.02) * 100;

            nextLocal[baseId] = [
              ...(nextLocal[baseId] || []),
              { id: obj.id, type: obj.type, x: relX, y: relY, targetX: 0, targetY: 0, speedPx }
            ];
          });
          return nextLocal;
        });
      }

      return next;
    });

    // Animate interceptors (unchanged)
    setActiveInterceptors(prev => prev.map(intc => {
      if (intc.exploded || intc.reached) return intc;
      const targetObj = globalObjectsRef.current.find(o => o.id === intc.targetId && !o.exploded);
      if (!targetObj) return { ...intc, exploded: true };
      const { vx, vy } = calculateVelocity(intc.lat, intc.lng, targetObj.lat, targetObj.lng, intc.speed);
      const dx = targetObj.lng - intc.lng;
      const dy = targetObj.lat - intc.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.05) {
        if (mapInstance) {
          const point = mapInstance.latLngToContainerPoint([targetObj.lat,targetObj.lng]);
          setExplosions(prev => [...prev,{x:point.x,y:point.y}]);
        }
        setGlobalObjects(prev => prev.map(o => o.id === targetObj.id ? { ...o, exploded: true } : o));
        return { ...intc, exploded: true };
      }
      return { ...intc, vx, vy, lat: intc.lat + vy, lng: intc.lng + vx };
    }));

  }, 30);

  return () => clearInterval(interval);
}, [mapInstance, smoothBasePositions]);


  // --- project to canvas ---
  const baseUnitsToScale = globalObjects.filter(o => !["missile","drone","artillery","interceptor"].includes(o.type));
  const scaledBaseUnits = useSubBaseUnits(baseUnitsToScale, konvaZoom);

 const projectObjects = globalObjects
  .filter(o => ["missile","drone","artillery"].includes(o.type) && !o.exploded)
  .map(obj => {
    if (!mapInstance) return null;

    const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);

    // Ensure Central AI fields are present
    return { 
      ...obj,
      x: point?.x || 0,
      y: point?.y || 0,
      currentX: point?.x || 0,
      currentY: point?.y || 0,
      currentLat: obj.lat,
      currentLng: obj.lng,
      vx: obj.vx ?? 0,
      vy: obj.vy ?? 0,
      category: obj.category ?? obj.type // so drones have category "drone"
    };
  })
  .filter(Boolean);


  const interceptorsInPixels = activeInterceptors
    .filter(o => !o.exploded)
    .map(obj => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat,obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0 };
    }).filter(Boolean);

  const allUnitsForCanvas = [...scaledBaseUnits, ...projectObjects, ...interceptorsInPixels];


  useCentralAI(allUnitsForCanvas, ()=>{}, signal=>socket.emit("unit-signal", signal), showMessageRef.current);

  return (
    <>
      {mapInstance && BASES.map(base => (
        <Marker
          key={base.id}
          position={base.coords}
          icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
          eventHandlers={{ click: ()=>{ setFocusMode(true); setSelectedBaseId(base.id); mapInstance.flyTo(base.coords, 15); } }}
        />
      ))}

      {LAUNCH_ZONES.map(zone => (
        <Polygon key={zone.id} positions={zone.polygon} pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.3 }} />
      ))}

      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 400, pointerEvents: "none" }}>
        {mapInstance && mapSize.width && mapSize.height && (
          <GridCanvas
            width={mapSize.width}
            height={mapSize.height}
            explosions={explosions}
            setExplosions={setExplosions}
            objects={allUnitsForCanvas}
            localThreats={localThreats}  
            removeLocalThreat={(baseId, id) => {
              setLocalThreats(prev => {
                const copy = { ...prev };
                copy[baseId] = (copy[baseId] || []).filter(t => t.id !== id);
                return copy;
              });
            }}
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
onLaunchInterceptor={launchData => {
  if (!launchData) return;

  const { launcherId, threatId } = launchData;

  // Find launcher in globalObjects
  const launcher = globalObjects.find(o => o.id === launcherId);
  if (!launcher) {
    console.error("[Interceptor Launch] Launcher not found:", launcherId);
    return;
  }

  // Find target missile/drone/artillery in globalObjects
  const target = globalObjects.find(o => o.id === threatId && !o.exploded);
  if (!target) {
    console.error("[Interceptor Launch] Target not found or already exploded:", threatId);
    return;
  }

  const launcherLat = launcher.lat;
  const launcherLng = launcher.lng;
  const targetLat = target.lat;
  const targetLng = target.lng;

  console.log("[Interceptor Launch] From launcherLat/lng:", launcherLat, launcherLng, 
              "To targetLat/lng:", targetLat, targetLng);

  const { vx, vy } = calculateVelocity(launcherLat, launcherLng, targetLat, targetLng, 0.08);

  setActiveInterceptors(prev => [...prev, {
    id: `interceptor-${Date.now()}`,
    threatId,
    type: "interceptor",
    lat: launcherLat,
    lng: launcherLng,
    targetId: threatId,
    speed: 0.05,
    vx, vy,
    exploded: false,
    reached: false
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