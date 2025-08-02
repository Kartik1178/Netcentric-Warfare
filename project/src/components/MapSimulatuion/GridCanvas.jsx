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

function BaseGridBackground({ radius = 150, cellSize = 30 }) {
  const lines = [];

  // Vertical Lines
  for (let x = -radius; x <= radius; x += cellSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, -radius, x, radius]}
        stroke="rgba(0,255,255,0.3)" // brighter cyan
        strokeWidth={1}
      />
    );
  }

  // Horizontal Lines
  for (let y = -radius; y <= radius; y += cellSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[-radius, y, radius, y]} // correct horizontal orientation
        stroke="rgba(0,255,255,0.3)"
        strokeWidth={1}
      />
    );
  }

  return (
    <Group>
      {/* Semi-transparent dark base */}
      <Rect
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        fill="rgba(0,20,30,0.4)" // dark cyan tint
        cornerRadius={10}
      />

      {/* Grid Lines */}
      {lines}

      {/* Glowing Border */}
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
  incomingSignals,
  setIncomingSignals,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
  focusMode,
  baseZones,
  zoom,
  selectedBaseId,
}) {
  const stageRef = useRef();

  const missiles = objects.filter((o) => o.type === "missile");
  const interceptors = objects.filter((o) => o.type === "interceptor");
  const baseUnits = objects.filter((o) => o.type !== "missile" && o.type !== "interceptor");

  const showDetails = zoom >= 7;

  // Animate base markers smoothly
  useEffect(() => {
    if (!stageRef.current) return;

    Object.entries(baseZones).forEach(([baseId, basePos]) => {
      const node = stageRef.current.findOne(`#marker-${baseId}`);
      if (node && basePos) {
        node.to({
          x: basePos.x,
          y: basePos.y,
          duration: 0.3,
          easing: Konva.Easings.EaseInOut,
        });
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
        zIndex: 1000,
        pointerEvents: focusMode ? "auto" : "none",
      }}
    >
      <Layer>
        {/* Main bases with sub-bases */}
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
                        x: unit.x, // ✅ Already local + scaled
                        y: unit.y,
                        baseId: unit.baseId,
                        objects,
                        jammerReports,
                        setJammerReports,
                        currentFrequency,
                        setCurrentFrequency,
                        availableFrequencies,
                      };

                      switch (unit.type) {
                        case "radar": return <Radar {...commonProps} />;
                        case "antenna": return <Antenna {...commonProps} />;
                        case "jammer": return <DefenseJammer {...commonProps} />;
                        case "launcher": return <Launcher {...commonProps} />;
                        default: return null;
                      }
                    })}
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {/* Missiles */}
        {missiles.map((missile) => (
          <Missile key={missile.id} missile={missile} listening={false} />
        ))}

        {/* Interceptors */}
        {interceptors.map((interceptor) => (
          <Interceptor key={interceptor.id} interceptor={interceptor} listening={false} />
        ))}

        {/* Explosions */}
        {explosions.map((explosion) => (
          <Explosion
            key={explosion.id}
            x={explosion.x}
            y={explosion.y}
            onComplete={() => setExplosions((prev) => prev.filter((e) => e.id !== explosion.id))}
            listening={false}
          />
        ))}
      </Layer>
    </Stage>
  );
}
