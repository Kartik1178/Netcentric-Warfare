import { Stage, Layer, Group, Circle, Text } from "react-konva";
import Missile from "./Missile";
import { Interceptor } from "./Interceptor";
import Explosion from "../Explosion";
import Radar from "./RadarUnit";
import Antenna from "./AntennaUnit";
import CentralAI from "./CentralAI";
import DefenseJammer from "./DefenseJammer";

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
  const missiles = objects.filter((o) => o.type === "missile");
  const interceptors = objects.filter((o) => o.type === "interceptor");
  const baseUnits = objects.filter(
    (o) => o.type !== "missile" && o.type !== "interceptor"
  );
console.log("🎯 Rendering Konva with baseZones:", baseZones);
console.log("🟢 GridCanvas Rendered", { width, height, baseZones });

  const showDetails = zoom >= 7; // show units only when zoomed in

  return (
    <Stage
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
        {/* 🔹 Debug Layer: Always show base red dots */}
        {Object.entries(baseZones).map(([baseId, basePos]) => {
          if (!basePos) return null;
          return (
            <Circle
              key={`debug-${baseId}`}
              x={basePos.x}
              y={basePos.y}
              radius={8}
              fill="red"
              opacity={0.8}
            />
          );
        })}

        {/* 🔹 Render Bases and Units */}
        {Object.entries(baseZones).map(([baseId, basePos]) => {
  if (!basePos) return null;
  return (
    <Group key={`debug-${baseId}`}>
      <Circle x={basePos.x} y={basePos.y} radius={8} fill="red" opacity={0.8} />
      <Text
        x={basePos.x + 10}
        y={basePos.y - 10}
        text={`${baseId}\n(${Math.round(basePos.x)}, ${Math.round(basePos.y)})`}
        fontSize={12}
        fill="black"
        stroke="white"
        strokeWidth={0.5}
      />
    </Group>
  );
})}

        {Object.entries(baseZones).map(([baseId, basePos]) => {
          if (focusMode && selectedBaseId && baseId !== selectedBaseId) return null;
          if (!basePos) return null;

          const units = baseUnits.filter((unit) => unit.baseId === baseId);

          return (
            <Group
              key={baseId}
              x={basePos.x}
              y={basePos.y}
              listening={true}
              onMouseEnter={(e) =>
                (e.target.getStage().container().style.cursor = "pointer")
              }
              onMouseLeave={(e) =>
                (e.target.getStage().container().style.cursor = "default")
              }
              onClick={() => onBaseClick?.(baseId)}
            >
              {/* ✅ Invisible larger circle for easier clicks */}
              <Circle
                radius={25}
                fillEnabled={false}
                strokeEnabled={false}
              />

              {/* 🟠 Visible Base Marker */}
              <Circle radius={15} fill="orange" stroke="black" strokeWidth={2} />
              <Text
                text={baseId}
                y={20}
                offsetX={baseId.length * 3}
                fontSize={14}
                fill="black"
              />

              {showDetails && (
                <>
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
                      case "jammer":
                        return (
                          <DefenseJammer
                            key={unit.id}
                            id={unit.id}
                            x={unit.x}
                            y={unit.y}
                            currentFrequency={currentFrequency}
                          />
                        );
                      default:
                        return null;
                    }
                  })}
                </>
              )}
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
