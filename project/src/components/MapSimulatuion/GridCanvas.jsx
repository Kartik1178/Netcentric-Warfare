// In GridCanvas.js
import BaseGridBackground from "../../constants/BaseGridBackground";
import React, { useEffect, useRef } from "react";
import { Rect, Stage, Layer, Line, Group } from "react-konva";
import Konva from "konva";
import Radar from "./RadarUnit";
import Antenna from "./AntennaUnit";
import DefenseJammer from "./DefenseJammer";
import Launcher from "./LauncherUnit";
import Missile from "./Missile";
import { Interceptor } from "./Interceptor";
import Explosion from "../Explosion";
import CentralAIUnit from "./CentralAIUnit";
import { CENTRAL_AI_POSITION } from "../../constants/AIconstant";
import FloatingMessages from "./FloatingMessages";

export default function GridCanvas({
  width, height, explosions, setExplosions, objects,
  jammerReports, setJammerReports, mapInstance, currentFrequency,
  setCurrentFrequency, availableFrequencies, focusMode, baseZones,
  zoom, selectedBaseId, floatingMessages, onLaunchInterceptor, onLogsUpdate
}) {
  // ✅ THIS LOG IS NOW THE MOST IMPORTANT ONE.
console.log('Hi')
useEffect(() => {
  console.log("✅ GridCanvas mounted");
}, []);

  const stageRef = useRef();

  return (
    <Stage ref={stageRef} width={width} height={height} style={{ position: "absolute", top: 0, left: 0, zIndex: 1000, pointerEvents: "none" }}>
      <Layer>
        {/* Render all objects based on their type */}
        {objects.map((unit) => {
          const commonProps = {
            key: unit.id, id: unit.id, baseId: unit.baseId, objects, jammerReports,
            setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies, onLogsUpdate,
          };

          switch (unit.type) {
            // ✅ The rendering logic is now much cleaner
            case "radar":
              return <Radar {...commonProps} x={unit.x} y={unit.y} globalX={unit.x} globalY={unit.y} mapInstance={mapInstance} />;
            case "antenna":
              return <Antenna {...commonProps} x={unit.x} y={unit.y} />;
            case "jammer":
              return <DefenseJammer {...commonProps} x={unit.x} y={unit.y} />;
            case "launcher":
              return <Launcher {...commonProps} x={unit.x} y={unit.y} />;
            case "missile":
              return <Missile key={unit.id} missile={unit} />;
            case "interceptor":
              return <Interceptor key={unit.id} interceptor={unit} />;
            default:
              return null;
          }
        })}

        {/* Explosions and FloatingMessages can remain the same */}
        {explosions.map((explosion) => (
          <Explosion
            key={explosion.id}
            x={explosion.x}
            y={explosion.y}
            onComplete={() => setExplosions((prev) => prev.filter((e) => e.id !== explosion.id))}
          />
        ))}
        <FloatingMessages messages={floatingMessages} />
      </Layer>
    </Stage>
  );
}
