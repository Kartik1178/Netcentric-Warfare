import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import useDefenseSystemManager from "../hooks/DefenseSystemManager";
import { useIndependentDefense } from "../hooks/useIndependentDefense";

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
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

// 🔹 Helper component that legally runs the hook
function BackgroundDefenseEngine({ objects, zoom, onLogsUpdate, showMessage, baseId, active, spawnInterceptor }) {

  useDefenseSystemManager({
    objects,
    zoom,
    onLogsUpdate,
    emitSignal: (signal) => socket.emit("unit-signal", signal),
    showMessage,
    baseId,
    active,
    spawnInterceptor,
  });
  return null;
}

export default function TerritoryMap(props) {
  const {
    onLogsUpdate, newMissile, newDrone, newArtillery,
    zoom, center, mapInstance, mapSize,
    focusMode, setFocusMode, selectedBaseId, setSelectedBaseId, customBases
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

  // 🔹 Merge hardcoded + custom into one master list
  const ALL_BASES = useMemo(() => [...BASES, ...customBases], [customBases]);

  const { pixelPositions, zoom: konvaZoom } = useLeafletToKonvaTransform({ mapInstance, baseData: ALL_BASES, mapSize });
  const smoothBasePositions = useSmoothPositions(pixelPositions, 300);
  const [localThreats, setLocalThreats] = useState({});
  const HANDOFF_DEG = 0.02;

  // 🔹 Generate units for ALL bases
  useEffect(() => {
    if (!pixelPositions || Object.keys(pixelPositions).length === 0) return;

    const generateUnitsForBase = (base) => {
      const dynamicRadius = konvaZoom >= 15 ? 80 : konvaZoom >= 13 ? 70 : 60;
      return [1, 2, 3, 4].flatMap(i => {
        const subBaseId = `${base.id}-sub${i}`;
        return generateBaseUnits(subBaseId, base.type, dynamicRadius, customBases).map(u => ({
          ...u, localX: u.x, localY: u.y
        }));
      });
    };

    const selectedBases = focusMode && selectedBaseId
      ? ALL_BASES.filter(b => b.id === selectedBaseId)
      : ALL_BASES;

    const allUnits = selectedBases.flatMap(generateUnitsForBase);

    setGlobalObjects(prev => {
      const staticObjs = prev.filter(o =>
        ["missile", "drone", "artillery", "interceptor"].includes(o.type)
      );

      const next = [...staticObjs, ...allUnits];

      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      return next;
    });
  }, [pixelPositions, konvaZoom, focusMode, selectedBaseId, customBases, ALL_BASES]);

  const VELOCITY_BY_TYPE = { missile: 0.05, drone: 0.02, artillery: 0.015 };

  // 🔹 Spawn new threats
  useEffect(() => {
    const newObjs = [newMissile, newDrone, newArtillery].filter(Boolean);
    newObjs.forEach(objData => {
      if (!objData || spawnedObjects.current.has(objData.id)) return;
      const speed = VELOCITY_BY_TYPE[objData.type] || 0.05;
      const { vx, vy } = calculateVelocity(objData.startLat, objData.startLng, objData.targetLat, objData.targetLng, speed);
      setGlobalObjects(prev => [...prev, {
        id: objData.id, type: objData.type,
        lat: objData.startLat, lng: objData.startLng,
        currentLat: objData.startLat, currentLng: objData.startLng, // Add current coordinates for defense systems
        targetLat: objData.targetLat, targetLng: objData.targetLng,
        baseId: objData.baseId, speed, vx, vy, exploded: false
      }]);
      spawnedObjects.current.add(objData.id);
    });
  }, [newMissile, newDrone, newArtillery]);

  // 🔹 Animate threats + interceptors
  useEffect(() => {
    const THRESHOLDS = { missile: 0.001, drone: 0.001, artillery: 0.001 };
    const SLOW_RADIUS = 0.5;

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

          let nearestBase = null;
          let minD = Infinity;
          for (const b of ALL_BASES) {
            const dLat = b.coords[0] - obj.lat;
            const dLng = b.coords[1] - obj.lng;
            const d = Math.sqrt(dLat * dLat + dLng * dLng);
            if (d < minD) { minD = d; nearestBase = b; }
          }

          let speedFactor = 1;
          if (nearestBase && minD <= SLOW_RADIUS) {
            speedFactor = minD / SLOW_RADIUS;
          }

          if (nearestBase && minD <= HANDOFF_DEG && !obj.handedOff) {
            handoffList.push({ obj, baseId: nearestBase.id });
            next.push({ ...obj, vx: 0, vy: 0, handedOff: true });
            continue;
          }

          const { vx, vy } = calculateVelocity(obj.lat, obj.lng, obj.targetLat, obj.targetLng, obj.speed * speedFactor);
          const newLat = obj.lat + vy;
          const newLng = obj.lng + vx;
          next.push({ 
            ...obj, 
            lat: newLat, 
            lng: newLng, 
            currentLat: newLat,  // Add currentLat for defense systems
            currentLng: newLng,  // Add currentLng for defense systems
            vx, 
            vy 
          });
        }

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
  }, [mapInstance, smoothBasePositions, ALL_BASES]);

  // 🔹 Project to canvas
  const baseUnitsToScale = globalObjects.filter(o => !["missile","drone","artillery","interceptor"].includes(o.type));
  const scaledBaseUnits = useSubBaseUnits(baseUnitsToScale, konvaZoom);

  const projectObjects = globalObjects
    .filter(o => ["missile","drone","artillery"].includes(o.type) && !o.exploded)
    .map(obj => {
      if (!mapInstance) return null;
      const point = mapInstance.latLngToContainerPoint([obj.lat, obj.lng]);
      return { ...obj, x: point?.x || 0, y: point?.y || 0, currentX: point?.x || 0, currentY: point?.y || 0,
        currentLat: obj.lat, currentLng: obj.lng, vx: obj.vx ?? 0, vy: obj.vy ?? 0, category: obj.category ?? obj.type };
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
  
  // 🔹 Always include ALL base units for defense systems, regardless of zoom level
  // This ensures defense functionality works even when units aren't visually rendered
  const allUnitsForDefense = [
    ...globalObjects.filter(o => !["missile","drone","artillery","interceptor"].includes(o.type)), 
    ...globalObjects.filter(o => ["missile","drone","artillery"].includes(o.type) && !o.exploded), // Use original objects, not projected ones
    ...interceptorsInPixels,
    // Add actual base objects for DefenseSystemManager
    ...ALL_BASES.map(base => ({
      id: base.id,
      type: "base",
      lat: base.coords[0],
      lng: base.coords[1],
      name: base.name,
      baseType: base.type
    }))
  ];
  const isZoomedOut = konvaZoom < 13;

  // 🔹 Create spawnInterceptor function for background defense
  const spawnInterceptor = useCallback((launchData) => {
    console.log(`[BackgroundDefense] spawnInterceptor called with:`, launchData);
    if (!launchData) {
      console.error("[BackgroundDefense] No launch data provided");
      return;
    }
    const { launcherId, threatId, launcherLat, launcherLng, targetLat, targetLng, vx, vy } = launchData;
    
    // Find the launcher and target in globalObjects
    const launcher = globalObjects.find(o => o.id === launcherId);
    const target = globalObjects.find(o => o.id === threatId && !o.exploded);
    
    console.log(`[BackgroundDefense] Launcher found:`, !!launcher, "Target found:", !!target);
    
    if (!launcher) {
      console.error("Launcher not found:", launcherId);
      return;
    }
    if (!target) {
      console.error("Target not found:", threatId);
      return;
    }

    // Calculate velocity if not provided
    const calculatedVelocity = vx && vy ? { vx, vy } : calculateVelocity(
      launcherLat || launcher.lat, 
      launcherLng || launcher.lng, 
      targetLat || target.lat, 
      targetLng || target.lng, 
      0.08
    );

    const interceptorData = {
      id: `interceptor-${Date.now()}-${Math.random()}`,
      threatId,
      type: "interceptor",
      lat: launcherLat || launcher.lat,
      lng: launcherLng || launcher.lng,
      targetId: threatId,
      speed: 0.05,
      ...calculatedVelocity,
      exploded: false,
      reached: false
    };

    console.log(`[BackgroundDefense] Creating interceptor:`, interceptorData);

    // Add interceptor to active interceptors
    setActiveInterceptors(prev => {
      const newInterceptors = [...prev, interceptorData];
      console.log(`[BackgroundDefense] Total interceptors: ${newInterceptors.length}`);
      return newInterceptors;
    });

    console.log(`[BackgroundDefense] 🚀 Successfully launched interceptor from ${launcherId} towards ${threatId}`);
  }, [globalObjects, setActiveInterceptors]);

  // 🔹 Debug: Log what objects are being passed to defense systems
  useEffect(() => {
    console.log(`[TerritoryMap] Defense objects at zoom ${konvaZoom}:`, {
      total: allUnitsForDefense.length,
      bases: allUnitsForDefense.filter(o => o.type === "base").length,
      units: allUnitsForDefense.filter(o => !["missile","drone","artillery","interceptor","base"].includes(o.type)).length,
      missiles: allUnitsForDefense.filter(o => o.type === "missile").length,
      interceptors: allUnitsForDefense.filter(o => o.type === "interceptor").length
    });
  }, [allUnitsForDefense, konvaZoom]);

  // 🔹 Independent Defense System - works regardless of visual rendering
  const missilesForDefense = globalObjects.filter(o => o.type === "missile" && !o.exploded && !o.reached);
  
  // Debug: Log missiles being passed to independent defense
  useEffect(() => {
    console.log(`[TerritoryMap] Missiles for independent defense:`, {
      total: missilesForDefense.length,
      missiles: missilesForDefense.map(m => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        exploded: m.exploded,
        reached: m.reached
      }))
    });
  }, [missilesForDefense]);
  
  useIndependentDefense(missilesForDefense, setActiveInterceptors, konvaZoom);

  // 🔹 Move interceptors and handle collisions
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveInterceptors(prev => {
        return prev.map(interceptor => {
          if (interceptor.exploded || interceptor.reached) return interceptor;

          // Find target missile
          const target = globalObjects.find(m => m.id === interceptor.targetId && !m.exploded);
          if (!target) {
            console.log(`[Interceptor] Target ${interceptor.targetId} not found, exploding interceptor`);
            return { ...interceptor, exploded: true };
          }

          // Move interceptor towards target
          const dx = target.lng - interceptor.lng;
          const dy = target.lat - interceptor.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const speed = interceptor.speed || 0.05;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;

          // Check collision
          if (dist < 0.05) {
            console.log(`[Interceptor] 💥 Collision! Interceptor ${interceptor.id} hit missile ${target.id}`);
            
            // Mark both as exploded
            setGlobalObjects(prevObjs => 
              prevObjs.map(obj => 
                obj.id === target.id ? { ...obj, exploded: true } : obj
              )
            );
            
            return { ...interceptor, exploded: true, reached: true };
          }

          // Update interceptor position
          return {
            ...interceptor,
            vx,
            vy,
            lat: interceptor.lat + vy,
            lng: interceptor.lng + vx,
          };
        }).filter(interceptor => !interceptor.exploded); // Remove exploded interceptors
      });
    }, 30);

    return () => clearInterval(interval);
  }, [globalObjects, setActiveInterceptors]);

  // 🔹 Central AI (only active when zoomed in - base units visible)
  const isZoomedIn = konvaZoom >= 8; // Same threshold as base unit visibility
  
  // Debug: Log which defense system is active
  useEffect(() => {
    console.log(`[TerritoryMap] Defense system status at zoom ${konvaZoom}:`, {
      isZoomedIn,
      normalDefenseActive: isZoomedIn,
      independentDefenseActive: !isZoomedIn,
      baseUnitsVisible: isZoomedIn
    });
  }, [konvaZoom, isZoomedIn]);
  
  useCentralAI(isZoomedIn ? allUnitsForDefense : [], ()=>{}, signal=>socket.emit("unit-signal", signal), showMessageRef.current);

  return (
    <>
      {/* Run background defense engines only when zoomed in (base units visible) */}
      {isZoomedIn && ALL_BASES.map(base => (
        <BackgroundDefenseEngine
          key={base.id}
          objects={allUnitsForDefense}
          zoom={konvaZoom}
          onLogsUpdate={onLogsUpdate}
          showMessage={showMessageRef.current}
          baseId={base.id}
          active={isZoomedIn}
          spawnInterceptor={spawnInterceptor}
        />
      ))}



      {mapInstance && ALL_BASES.map(base => (
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
              const launcher = globalObjects.find(o => o.id === launcherId);
              if (!launcher) return console.error("Launcher not found:", launcherId);
              const target = globalObjects.find(o => o.id === threatId && !o.exploded);
              if (!target) return console.error("Target not found:", threatId);

              const { vx, vy } = calculateVelocity(launcher.lat, launcher.lng, target.lat, target.lng, 0.08);
              setActiveInterceptors(prev => [...prev, {
                id: `interceptor-${Date.now()}`,
                threatId,
                type: "interceptor",
                lat: launcher.lat,
                lng: launcher.lng,
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
