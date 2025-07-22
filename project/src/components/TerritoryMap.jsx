import { useEffect, useState } from "react";
import { Base } from "./Base";
import GridCanvas from "./MapSimulatuion/GridCanvas";
import { useSDR } from "../hooks/SDRContext";
import { generateBaseUnits } from "../hooks/GenerateBaseUnits";
import { proportionalNavigation } from "../hooks/useProportionalNavigation";
import { useRef } from "react";
import socket from "./socket";
import { useCentralAI } from "../hooks/useCentralAI";
import { getAllUnitsFromBases } from "../utils/getAllUnits";
import useFloatingMessages from "../hooks/useFloatingMessages";
export function TerritoryMap({ onLogsUpdate, newMissile, newJammer }) {
  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
const [floatingMessages, showMessage] = useFloatingMessages();

  const [globalObjects, setGlobalObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]);
const [selectedBaseId, setSelectedBaseId] = useState(null);
const [focusMode, setFocusMode] = useState(false);
const spawnedMissiles = useRef(new Set());
const [explosions, setExplosions] = useState([]);

const baseConfigs = [
  { id: "base1", position: { x: 150, y: 400 } },
  { id: "base2", position: { x: 500, y: 400 } },
  { id: "base3", position: { x: 845, y: 400 } },
];
useEffect(() => {
  setGlobalObjects((prev) => {
    const existingIds = new Set(prev.map((o) => o.id));

    const allUnits = [];
    baseConfigs.forEach((base) => {
      const baseUnits = generateBaseUnits(base, 300);
      baseUnits.forEach(unit => {
        if (!existingIds.has(unit.id)) {
          allUnits.push(unit);
        }
      });
    });

    return [...prev, ...allUnits];
  });
}, []);
useEffect(() => {
  if (!newMissile || spawnedMissiles.current.has(newMissile.id)) return;

  const missileObj = {
    id: newMissile.id,
    type: "missile",
    x: newMissile.startPosition.x,
    y: newMissile.startPosition.y,
    targetX: newMissile.targetPosition.x,
    targetY: newMissile.targetPosition.y,
    speed: 2,
  };

  setGlobalObjects((prev) => [...prev, missileObj]);
  spawnedMissiles.current.add(newMissile.id);

  onLogsUpdate?.({
    timestamp: new Date().toLocaleTimeString(),
    source: "TerritoryMap",
    type: "simulated",
    payload: missileObj,
    message: `Missile ${missileObj.id} spawned into simulation.`,
  });
}, [newMissile]);
useCentralAI(globalObjects, (log) => {
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
},showMessage 
);
const handleLaunchInterceptor = ({ launcherX, launcherY, targetX, targetY, threatId }) => {
  const newInterceptor = {
    id: `interceptor-${Date.now()}`,
    type: "interceptor",
    x: launcherX,
    y: launcherY,
    targetX,
    targetY,
    threatId,
    heading: 0,
    prevLosAngle: 0,
    speed: 5,
  };

  setGlobalObjects(prev => [...prev, newInterceptor]);

  onLogsUpdate?.({
    timestamp: new Date().toLocaleTimeString(),
    source: "Launcher",
    type: "interceptor-launch",
    payload: newInterceptor,
    message: `Interceptor launched to target ${threatId}`,
  });
};

  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalObjects((prev) => {
        const updated = prev.map((obj) => {
          if (obj.type === "missile") {
            const dx = obj.targetX - obj.x;
            const dy = obj.targetY - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              return {
                ...obj,
                x: obj.x + (dx / dist) * obj.speed,
                y: obj.y + (dy / dist) * obj.speed,
              };
            }
          }

          if (obj.type === "interceptor") {
            const target = prev.find((o) => o.id === obj.threatId);
            if (target) {
              const result = proportionalNavigation({
                x: obj.x, y: obj.y,
                target,
                speed: obj.speed,
                heading: obj.heading,
                prevLosAngle: obj.prevLosAngle,
                N: 5,
              });
              return {
                ...obj,
                x: result.newX,
                y: result.newY,
                heading: result.newHeading,
                prevLosAngle: result.newPrevLosAngle,
              };
            }
          }
          return obj;
        });

        // === Collision logic ===
        const surviving = [];
        const missiles = updated.filter((o) => o.type === "missile");
        const interceptors = updated.filter((o) => o.type === "interceptor");
        const others = updated.filter((o) => o.type !== "missile" && o.type !== "interceptor");

        const destroyedMissileIds = new Set();
        const destroyedInterceptorIds = new Set();

        missiles.forEach((m) => {
          interceptors.forEach((i) => {
            const dx = m.x - i.x;
            const dy = m.y - i.y;
            if (Math.sqrt(dx * dx + dy * dy) <= 50) {
              destroyedMissileIds.add(m.id);
              destroyedInterceptorIds.add(i.id);
              console.log(`💥 Destroyed! Missile ${m.id} & Interceptor ${i.id}`);
            setExplosions((prev) => [
    ...prev,
    {
       id: `explosion-${Date.now()}-${Math.random()}`,
      x: m.x,
      y: m.y,
    },
  ]);
           
           
            }
          });
        });

        missiles.filter((m) => !destroyedMissileIds.has(m.id)).forEach((m) => surviving.push(m));
        interceptors.filter((i) => !destroyedInterceptorIds.has(i.id)).forEach((i) => surviving.push(i));
        others.forEach((o) => surviving.push(o));

        return surviving;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);
const visibleObjects =
    focusMode && selectedBaseId
      ? globalObjects.filter((obj) => {
          if (obj.id.startsWith(selectedBaseId)) return true;
          if (obj.type === "missile" || obj.type === "interceptor") return true; // adjust if needed
          return false;
        })
      : globalObjects;

  return (
    <div className="w-full h-full relative">
      {baseConfigs.map((base) => (
  <Base
    key={base.id}
    id={base.id}
    position={base.position}
    globalObjects={globalObjects}
    setGlobalObjects={setGlobalObjects}
    incomingSignals={incomingSignals}
    setIncomingSignals={setIncomingSignals}
    onLogsUpdate={onLogsUpdate}
    newMissiles={[]} // 🔄 No longer sending missiles to base
    newJammers={newJammer ? [newJammer] : []}
  />
))}

<div className="absolute top-4 left-4 z-10 p-2 bg-white rounded shadow">
  <button
    onClick={() => setFocusMode(!focusMode)}
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
    {baseConfigs.map((base) => (
      <option key={base.id} value={base.id}>{base.id}</option>
    ))}
  </select>
</div>

      <GridCanvas
       explosions={explosions}
  setExplosions={setExplosions}
        objects={visibleObjects}
        incomingSignals={incomingSignals}
        setIncomingSignals={setIncomingSignals}
        jammerReports={jammerReports}
        onLaunchInterceptor={handleLaunchInterceptor}
        setJammerReports={setJammerReports}
        currentFrequency={currentFrequency}
        setCurrentFrequency={setCurrentFrequency}
        availableFrequencies={availableFrequencies}
      focusMode={focusMode}
      baseZones={baseConfigs}
        selectedBaseId={selectedBaseId}
        floatingMessages={floatingMessages}
      />
    </div>
  );
}
