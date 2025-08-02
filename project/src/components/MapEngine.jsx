import React, { useEffect, useState, useRef } from "react";
import GridCanvas from "./MapSimulation/GridCanvas";
import { BASES } from "../constants/baseData";
import { generateBaseUnits } from "../hooks/GenerateBaseUnits";
import { useCentralAI } from "../hooks/useCentralAI";
import { useFloatingMessages } from "../hooks/useFloatingMessages";
import { useSDR } from "../hooks/SDRContext";
import { proportionalNavigation } from "../hooks/useProportionalNavigation";
import { Base } from "./Base";

export default function MapEngine({
  zoom,
  center,
  newMissile,
  newJammer,
  onLogsUpdate,
  jammerReports,
  onLaunchInterceptor,
  selectedBaseId,
  focusMode
}) {
  const [missiles, setMissiles] = useState([]);
  const [interceptors, setInterceptors] = useState([]);
  const [units, setUnits] = useState([]);
  const { floatingMessages, addFloatingMessage } = useFloatingMessages();
  const { decideDefenseAction } = useCentralAI();
  const { currentFrequency } = useSDR();

  // ⚡ Generate base units on mount
  useEffect(() => {
    const generatedUnits = BASES.map(base => generateBaseUnits(base)).flat();
    setUnits(generatedUnits);
  }, []);

  // 🎯 Central AI handles new threats
  useEffect(() => {
    if (newMissile) decideDefenseAction(newMissile, units);
  }, [newMissile]);

  // 🛰️ Simulation loop for motion
  useEffect(() => {
    const interval = setInterval(() => {
      // update missiles
      setMissiles(prev =>
        prev
          .map(missile => ({
            ...missile,
            x: missile.x + missile.vx,
            y: missile.y + missile.vy
          }))
          .filter(m => !m.exploded)
      );

      // update interceptors
      setInterceptors(prev => {
        return prev.map(interceptor => {
          const target = missiles.find(m => m.id === interceptor.targetId);
          if (!target) return interceptor;

          const { vx, vy } = proportionalNavigation(interceptor, target, 0.05);
          return {
            ...interceptor,
            x: interceptor.x + vx,
            y: interceptor.y + vy
          };
        });
      });

      // check collisions
      setMissiles(prevMissiles => {
        return prevMissiles.map(missile => {
          const hit = interceptors.find(interceptor => {
            const dx = missile.x - interceptor.x;
            const dy = missile.y - interceptor.y;
            return Math.sqrt(dx * dx + dy * dy) < 15;
          });
          return hit ? { ...missile, exploded: true } : missile;
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [missiles, interceptors]);

  const isZoomedIn = zoom >= 6.5;

  return (
    <>
      {/* GridCanvas handles simulation visuals (always visible) */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-40"
        style={{ transform: "translateZ(0)" }}
      >
        <GridCanvas
          zoom={zoom}
          center={center}
          missiles={missiles}
          interceptors={interceptors}
          units={units}
          jammerReports={jammerReports}
          floatingMessages={floatingMessages}
          onLaunchInterceptor={onLaunchInterceptor}
          focusMode={focusMode}
          selectedBaseId={selectedBaseId}
          newMissile={newMissile}
          newJammer={newJammer}
          onLogsUpdate={onLogsUpdate}
        />
      </div>

      {/* Zoomed-in UI view (units, bases) */}
      {isZoomedIn && (
        <>
          {BASES.map(base => (
            <Base
              key={base.id}
              base={base}
              units={units.filter(u => u.baseId === base.id)}
              focusMode={focusMode}
              selectedBaseId={selectedBaseId}
              onLaunchInterceptor={onLaunchInterceptor}
              currentFrequency={currentFrequency}
            />
          ))}
        </>
      )}
    </>
  );
}
