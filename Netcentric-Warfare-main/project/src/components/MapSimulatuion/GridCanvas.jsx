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

function BaseGridBackground({ radius = 150, cellSize = 30 }) {
  const lines = [];
  for (let x = -radius; x <= radius; x += cellSize)
    lines.push(<Line key={`v-${x}`} points={[x, -radius, x, radius]} stroke="rgba(0,255,255,0.3)" strokeWidth={1} />);
  for (let y = -radius; y <= radius; y += cellSize)
    lines.push(<Line key={`h-${y}`} points={[-radius, y, radius, y]} stroke="rgba(0,255,255,0.3)" strokeWidth={1} />);

  return (
    <Group>
      <Rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} fill="rgba(0,20,30,0.4)" cornerRadius={10} />
      {lines}
      <Rect
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        stroke="rgba(0,255,255,0.7)"
        strokeWidth={2}
        dash={[12, 6]}
        shadowColor="cyan"
        shadowBlur={10}
        shadowOpacity={0.6}
        cornerRadius={10}
      />
    </Group>
  );
}

export default function GridCanvas({
  width,
  height,
  explosions,
  setExplosions,
  objects,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
  focusMode,
  baseZones,
   mapInstance,
  zoom,
  selectedBaseId,
  floatingMessages, // NEW: Floating messages state
  onBaseClick, // This seems to be unused, can be removed
  onLaunchInterceptor, // This is an unused prop, but let's keep it for now
  onLogsUpdate // NEW: onLogsUpdate prop for logging
}) {
  const stageRef = useRef();

  const missiles = objects.filter((o) => o.type === "missile");
  const interceptors = objects.filter((o) => o.type === "interceptor");
  const baseUnits = objects.filter((o) => o.type !== "missile" && o.type !== "interceptor");

  const showDetails = zoom >= 7;

  // 🔹 Log stage size to confirm canvas is correct
  useEffect(() => {
    console.log(`🖥 GridCanvas Stage Size: ${width} x ${height}`);
  }, [width, height]);

  // 🔹 Smooth base marker animation
  useEffect(() => {
    if (!stageRef.current) return;
    Object.entries(baseZones).forEach(([baseId, basePos]) => {
      const node = stageRef.current.findOne(`#marker-${baseId}`);
      if (node && basePos) {
        node.to({ x: basePos.x, y: basePos.y, duration: 0.3, easing: Konva.Easings.EaseInOut });
      }
    });
  }, [baseZones]);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.3)", // Reverted to semi-transparent black
        pointerEvents: "none",
      }}
    >
      <Layer>
        {/* ... existing Bases & Sub-Bases rendering logic ... */}
        {Object.entries(baseZones).map(([baseId, basePos]) => {
          if (focusMode && selectedBaseId && baseId !== selectedBaseId) return null;
          if (!basePos || !showDetails) return null;

          const subBaseSpacing = zoom >= 15 ? 300 : zoom >= 13 ? 200 : 120;
          const subBaseRadius = zoom >= 15 ? 70 : zoom >= 13 ? 55 : 45;
          const cellSize = zoom >= 15 ? 25 : 30;

          const subBaseOffsets = [
            [0, -subBaseSpacing],
            [subBaseSpacing, 0],
            [0, subBaseSpacing],
            [-subBaseSpacing, 0],
          ];

          return (
            <Group key={baseId} x={basePos.x} y={basePos.y}>
              {subBaseOffsets.map(([ox, oy], i) => {
                const subBaseId = `${baseId}-sub${i + 1}`;
                const subUnits = baseUnits.filter((u) => u.baseId === subBaseId);

                return (
                  <Group key={subBaseId} x={ox} y={oy}>
                    <BaseGridBackground radius={subBaseRadius} cellSize={cellSize} />
                    {subUnits.map((unit, idx) => {
                      const commonProps = {
                        key: unit.id || idx,
                        id: unit.id,
                        x: unit.x,
                        y: unit.y,
                        baseId: unit.baseId,
                        objects,
                        jammerReports,
                        
  stageContainer: stageRef.current,
                        setJammerReports,
                        currentFrequency,
                        setCurrentFrequency,
                        availableFrequencies,
                        onLogsUpdate, // Pass onLogsUpdate down to units
                      };
                      switch (unit.type) {
case "radar":
  return <Radar {...commonProps} x={unit.x} y={unit.y} absoluteX={basePos.x + ox + unit.x} // stage absolute
  absoluteY={basePos.y + oy + unit.y}/>;
                        case "antenna": return <Antenna {...commonProps} />;
                        case "jammer": return <DefenseJammer {...commonProps} />;
                        case "launcher": return <Launcher {...commonProps} onLaunchInterceptor={onLaunchInterceptor} />;
                        default: return null;
                      }
                    })}
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {/* 🚀 Central AI Visual Element now uses CENTRAL_AI_POSITION directly */}
        <CentralAIUnit id="central-ai-unit" label="C2 AI" x={CENTRAL_AI_POSITION.x} y={CENTRAL_AI_POSITION.y} />

        {/* 🔹 Missiles */}
        {missiles.map((missile) => {

          return (
            <Missile
              key={missile.id}
              x={missile.x}
              y={missile.y}
              radius={20}
            />
          );
        })}

        {/* 🔹 Interceptors */}
       {interceptors.map((intc) => (
  <Interceptor
    key={intc.id}
    x={intc.x}
    y={intc.y}
    radius={10}
  />
))}


        {/* 🔹 Explosions */}
        {explosions.map((ex, idx) => (
         <Explosion
  key={idx}
  x={ex.x}
  y={ex.y}
  onAnimationEnd={() => 
    setExplosions((prev) => prev.filter((_, i) => i !== idx))
  }
/>

        ))}
        <FloatingMessages messages={floatingMessages} />
      </Layer>
    </Stage>
  );
}