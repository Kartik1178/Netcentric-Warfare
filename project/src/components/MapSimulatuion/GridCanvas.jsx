import { useEffect, useRef } from "react";
import { Stage, Layer, Group, Circle, Rect, Text, RegularPolygon, Line } from "react-konva";
import Konva from "konva";
import Missile from "./Missile";
import { Interceptor } from "./Interceptor";
import Explosion from "../Explosion";
import Radar from "./RadarUnit";
import Antenna from "./AntennaUnit";
import CentralAI from "./CentralAI";
import DefenseJammer from "./DefenseJammer";
import { BASES } from "../../constants/baseData";
import Launcher from "./LauncherUnit";

// 🔹 Base Colors by Type
const baseColors = {
  Air: "#1E90FF",       // Blue
  Land: "#3CB371",      // Green
  Sea: "#00CED1",       // Cyan
  Submarine: "#8A2BE2", // Purple
};
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


function BaseMarker({ baseId, basePos, type, onClick, selected }) {
  const color = baseColors[type] || "gray";

  // Smaller marker sizes
  const shapes = {
    Air: <Circle radius={8} fill={color} stroke="white" strokeWidth={1.5} />,
    Land: <Rect width={16} height={16} offsetX={8} offsetY={8} fill={color} stroke="white" strokeWidth={1.5} />,
    Sea: <RegularPolygon sides={4} radius={10} fill={color} stroke="white" strokeWidth={1.5} rotation={45} />,
    Submarine: <RegularPolygon sides={3} radius={10} fill={color} stroke="white" strokeWidth={1.5} />,
  };

  return (
    <Group
      id={`marker-${baseId}`}
      x={basePos.x}
      y={basePos.y}
      onClick={() => onClick?.(baseId)}
      listening={true}
      scale={selected ? { x: 1.2, y: 1.2 } : { x: 1, y: 1 }}
    >
      {shapes[type]}

      {/* Regular font, slightly smaller */}
      <Text
        text={baseId.toUpperCase()}
        y={14}
        fontSize={12}
        fill="white"
        stroke="black"
        strokeWidth={0.5}
        align="center"
        offsetX={baseId.length * 3}
        fontFamily="sans-serif"  // Regular font
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
  onLaunchInterceptor,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
  focusMode,
  baseZones,
  zoom,
  center,
  selectedBaseId,
  floatingMessages = [],
  onBaseClick,
}) {
  const stageRef = useRef();
  const missiles = objects.filter((o) => o.type === "missile");
  const interceptors = objects.filter((o) => o.type === "interceptor");
  const baseUnits = objects.filter(
    (o) => o.type !== "missile" && o.type !== "interceptor"
  );

  const showDetails = zoom >= 7; // show units only when zoomed in

  // 🔹 Smooth repositioning animation
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
        {/* 🔹 Net-Centric Links (Optional) */}
        {Object.entries(baseZones).map(([id1, pos1], i, arr) =>
          arr.slice(i + 1).map(([id2, pos2]) =>
            pos1 && pos2 ? (
              <Line
                key={`${id1}-${id2}`}
                points={[pos1.x, pos1.y, pos2.x, pos2.y]}
                stroke="rgba(0,255,255,0.2)"
                dash={[8, 6]}
              />
            ) : null
          )
        )}



        {/* 🔹 Render Units only if zoomed in */}
        {Object.entries(baseZones).map(([baseId, basePos]) => {
          if (focusMode && selectedBaseId && baseId !== selectedBaseId) return null;
          if (!basePos) return null;

          const units = baseUnits.filter((unit) => unit.baseId === baseId);
          if (!showDetails) return null;
 const baseRadius = zoom >= 15 ? 180 : zoom >= 13 ? 140 : 100;
  const cellSize = zoom >= 15 ? 25 : 30;        
 return (
            <Group key={baseId} x={basePos.x} y={basePos.y}>
           
      <BaseGridBackground radius={baseRadius} cellSize={cellSize} />
           
              <CentralAI x={0} y={-100} floatingMessages={floatingMessages} />
              {units.map((unit) => {
                switch (unit.type) {
                  case "radar":
                    return (
                      <Radar
                        key={unit.id}
                        id={unit.id}
                        baseid={unit.baseId}
                        x={unit.x}
                        y={unit.y}
                        objects={objects}
                        jammerReports={jammerReports}
                        setJammerReports={setJammerReports}
                        currentFrequency={currentFrequency}
                        setCurrentFrequency={setCurrentFrequency}
                        availableFrequencies={availableFrequencies}
                      />
                    );
                  case "antenna":
                    return (
                      <Antenna
                        key={unit.id}
                        id={unit.id}
                        baseid={unit.baseId}
                        x={unit.x}
                        y={unit.y}
                        jammerReports={jammerReports}
                        setJammerReports={setJammerReports}
                        currentFrequency={currentFrequency}
                        setCurrentFrequency={setCurrentFrequency}
                        availableFrequencies={availableFrequencies}
                        emitSignal={(signal) =>
                          setIncomingSignals((prev) => [...prev, signal])
                        }
                      />
                    );
                  case "jammer": // ✅ Matches generateBaseUnits
            return (
              <DefenseJammer
                key={unit.id}
                id={unit.id}
                x={unit.x}
                y={unit.y}
                currentFrequency={currentFrequency}
              />
            );
          case "launcher": // ✅ NEW: Render launchers
            return (
              <Launcher
                key={unit.id}
                x={unit.x}
                y={unit.y}
                width={12}
                height={12}
                fill="orange"
                offsetX={6}
                offsetY={6}
              />
            );
                  default:
                    return null;
                }
              })}
            </Group>
          );
        })}

        {/* 🔹 Missiles */}
        {missiles.map((missile) => (
          <Missile key={missile.id} missile={missile} listening={false} />
        ))}

        {/* 🔹 Interceptors */}
        {interceptors.map((interceptor) => (
          <Interceptor key={interceptor.id} interceptor={interceptor} listening={false} />
        ))}

        {/* 🔹 Explosions */}
        {explosions.map((explosion) => (
          <Explosion
            key={explosion.id}
            x={explosion.x}
            y={explosion.y}
            onComplete={() =>
              setExplosions((prev) => prev.filter((e) => e.id !== explosion.id))
            }
            listening={false}
          />
        ))}
      </Layer>
    </Stage>
  );
}
