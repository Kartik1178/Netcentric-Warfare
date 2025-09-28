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
  { id: "pakistan-south", polygon: [[25.5,67.5],[25,67],[24.5,67],[24.5,67.5]], color: "rgba(255,50,50,0.3)" },
  { id: "arabian-sea", polygon: [[22,65.5],[20,65.5],[18,67],[18,69],[22,69]], color: "rgba(255,100,0,0.25)" },
  { id: "bay-of-bengal", polygon: [[17,87],[15,87],[13,89],[14,91],[17,89]], color: "rgba(255,0,200,0.25)" },
  { id: "indian-ocean", polygon: [[10,72],[7,72],[6,74],[7,76],[10,75]], color: "rgba(255,0,100,0.2)" },
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
    onLogsUpdate, newMissile, newDrone, newArtillery, newJammer,
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

  const VELOCITY_BY_TYPE = { missile: 0.05, drone: 0.02, artillery: 0.015 };

  // --- Clear on mount ---
  useEffect(() => {
    spawnedObjects.current.clear();
    setGlobalObjects([]);
  }, []);

  // --- Generate base units ---
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

    const allUnits = focusMode && selectedBaseId
      ? generateUnitsForBase(selectedBaseId)
      : BASES.flatMap(b => generateUnitsForBase(b.id));

    setGlobalObjects(prev => [
      ...prev.filter(o => ["missile","drone","artillery","interceptor","jammer"].includes(o.type)),
      ...allUnits
    ]);
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId]);

  // --- Spawn new objects uniformly ---
  useEffect(() => {
    const newObjs = [newMissile, newDrone, newArtillery, newJammer].filter(Boolean);

    newObjs.forEach(objData => {
      if (!objData || spawnedObjects.current.has(objData.id) || !mapInstance) return;

      const point = mapInstance.latLngToContainerPoint([objData.startLat, objData.startLng]);

      if (objData.type === "jammer") {
        setGlobalObjects(prev => [...prev, {
          ...objData,
          id: objData.id,
          type: "jammer",
          lat: objData.startLat,
          lng: objData.startLng,
          x: point.x,
          y: point.y,
          vx: 0, vy: 0, speed: 0,
          exploded: false
        }]);
      } else {
        const speed = VELOCITY_BY_TYPE[objData.type] || 0.05;
        const { vx, vy } = calculateVelocity(objData.startLat, objData.startLng, objData.targetLat, objData.targetLng, speed);

        setGlobalObjects(prev => [...prev, {
          id: objData.id,
          type: objData.type,
          lat: objData.startLat,
          lng: objData.startLng,
          targetLat: objData.targetLat,
          targetLng: objData.targetLng,
          baseId: objData.baseId,
          x: point.x,
          y: point.y,
          speed, vx, vy,
          exploded: false
        }]);
      }

      spawnedObjects.current.add(objData.id);
      console.log(`[TerritoryMap] ✅ ${objData.type} spawned: ${objData.id}`);
    });
  }, [newMissile, newDrone, newArtillery, newJammer, mapInstance]);

  // --- Animate objects & interceptors ---
// --- Animate objects & interceptors ---
useEffect(() => {
  const interval = setInterval(() => {
    // Move threats
    setGlobalObjects(prev =>
      prev.map(obj => {
        if (["missile", "drone", "artillery"].includes(obj.type) && !obj.exploded) {
          // ✅ Distance check
          const dx = obj.targetLng - obj.lng;
          const dy = obj.targetLat - obj.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.05) {
            console.log(`[TerritoryMap] 🎯 ${obj.type.toUpperCase()} reached target ${obj.baseId}`);
            return { ...obj, reached: true, exploded: true }; // stop moving
          }

          const newLat = obj.lat + obj.vy;
          const newLng = obj.lng + obj.vx;
          const point =
            mapInstance?.latLngToContainerPoint([newLat, newLng]) || {
              x: obj.x,
              y: obj.y,
            };

          return {
            ...obj,
            lat: newLat,
            lng: newLng,
            x: point.x,
            y: point.y,
          };
        }

        if (obj.type === "jammer" && mapInstance) {
          const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
          return { ...obj, x: point.x, y: point.y };
        }

        return obj;
      })
    );

    // Move interceptors (unchanged)
    setActiveInterceptors(prev =>
      prev.map(intc => {
        if (intc.exploded || intc.reached) return intc;
        const targetObj = globalObjectsRef.current.find(
          o => o.id === intc.targetId && !o.exploded
        );
        if (!targetObj) return { ...intc, exploded: true };

        const { vx, vy } = calculateVelocity(
          intc.lat,
          intc.lng,
          targetObj.lat,
          targetObj.lng,
          intc.speed
        );
        const dx = targetObj.lng - intc.lng;
        const dy = targetObj.lat - intc.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.05) {
          const point = mapInstance?.latLngToContainerPoint([
            targetObj.lat,
            targetObj.lng,
          ]);
          if (point)
            setExplosions(prev => [...prev, { x: point.x, y: point.y }]);
          setGlobalObjects(prev =>
            prev.map(o =>
              o.id === targetObj.id ? { ...o, exploded: true } : o
            )
          );
          return { ...intc, exploded: true };
        }

        return {
          ...intc,
          vx,
          vy,
          lat: intc.lat + vy,
          lng: intc.lng + vx,
        };
      })
    );
  }, 30);

  return () => clearInterval(interval);
}, [mapInstance]);


  // --- Project all for Canvas ---
  const baseUnitsToScale = globalObjects.filter(o => !["missile","drone","artillery","interceptor","jammer"].includes(o.type));
  const scaledBaseUnits = useSubBaseUnits(baseUnitsToScale, konvaZoom);

  const projectObjects = globalObjects
    .filter(o => ["missile","drone","artillery","jammer"].includes(o.type) && !o.exploded)
    .map(obj => {
      const point = mapInstance?.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0 };
    });

  const interceptorsInPixels = activeInterceptors
    .filter(o => !o.exploded)
    .map(obj => {
      const point = mapInstance?.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0 };
    });

  const allUnitsForCanvas = [...scaledBaseUnits, ...projectObjects, ...interceptorsInPixels];

  // --- Central AI ---
  useCentralAI(allUnitsForCanvas, () => {}, signal => socket.emit("unit-signal", signal), showMessageRef.current);

  return (
    <>
      {mapInstance && BASES.map(base => (
        <Marker
          key={base.id}
          position={base.coords}
          icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
          eventHandlers={{ click: () => {
            setFocusMode(true);
            setSelectedBaseId(base.id);
            mapInstance.flyTo(base.coords, 15);
          }}}
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
              const { vx, vy } = calculateVelocity(norm.launcherLat, norm.launcherLng, norm.targetLat, norm.targetLng, 0.08);
              const interceptorId = `interceptor-${Date.now()}`;
              setActiveInterceptors(prev => [...prev, {
                id: interceptorId,
                type: "interceptor",
                lat: norm.launcherLat,
                lng: norm.launcherLng,
                targetId: norm.targetId,   // ✅ consistent
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
