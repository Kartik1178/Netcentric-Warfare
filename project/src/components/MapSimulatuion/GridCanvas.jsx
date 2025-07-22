import React, { useEffect } from "react";
import { Stage, Layer, Rect, Line, Text } from "react-konva";
import Missile from "./Missile";
import Radar from "./RadarUnit";
import Launcher from "./LauncherUnit";
import Antenna from "./AntennaUnit";
import { Interceptor } from "./Interceptor";
import Jammer from "./JammerUnit";
import SignalLayer from "./SignalLayer";
import DefenseJammer from "./DefenseJammer";
import Explosion from "../Explosion";
import CentralAI from "./CentralAI";
import useFloatingMessages from "../../hooks/useFloatingMessages";
import FloatingMessage from "./FloatingMessage";
export default function GridCanvas({
  objects = [],
  incomingSignals = [],
  setIncomingSignals,
  onLaunchInterceptor,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
   baseZones = [],
  focusMode,
  selectedBaseId,
  explosions = [],

  setExplosions,
}) {
  const MAP_WIDTH = 1000;
  const MAP_HEIGHT = window.innerHeight * 0.9;
const [floatingMessages, showMessage] = useFloatingMessages();
  const CELL_SIZE = 25;
  const BASE_SIZE = 300;
 useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setIncomingSignals((prev) =>
        prev.filter((signal) => now - signal.createdAt < 2000)
      );
    }, 500);
    return () => clearInterval(interval);
  }, [setIncomingSignals]);

  return (
    <Stage width={MAP_WIDTH} height={MAP_HEIGHT}>
 <Layer>
  {/* Background */}
  <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0a0a1f" />

  {/* Grid lines */}
  {Array.from({ length: Math.ceil(MAP_WIDTH / CELL_SIZE) }).map((_, i) => (
    <Line
      key={`v-${i}`}
      points={[i * CELL_SIZE, 0, i * CELL_SIZE, MAP_HEIGHT]}
      stroke="#2d2d2d"
      strokeWidth={1}
    />
  ))}
  {Array.from({ length: Math.ceil(MAP_HEIGHT / CELL_SIZE) }).map((_, i) => (
    <Line
      key={`h-${i}`}
      points={[0, i * CELL_SIZE, MAP_WIDTH, i * CELL_SIZE]}
      stroke="#2d2d2d"
      strokeWidth={1}
    />
  ))}

  {/* === BASE ZONES === */}
  {baseZones.map((zone) => {
    const isFocused = focusMode && zone.id === selectedBaseId;
    const fillColor = isFocused
      ? "rgba(0, 255, 0, 0.2)"
      : focusMode
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 255, 0, 0.1)";

    const borderColor = isFocused ? "#00ff00" : "#666";

    return (
      <React.Fragment key={zone.id}>
        <Rect
          x={zone.position.x - BASE_SIZE / 2}
          y={zone.position.y - BASE_SIZE / 2}
          width={BASE_SIZE}
          height={BASE_SIZE}
          fill={fillColor}
          stroke={borderColor}
          strokeWidth={2}
        />
        <Text
          text={zone.id}
          x={zone.position.x - BASE_SIZE / 2 + 10}
          y={zone.position.y - BASE_SIZE / 2 + 10}
          fontSize={16}
          fill={isFocused ? "#00ff00" : "#999"}
        />
      </React.Fragment>
    );
  })}

  {/* === Signal lines === */}
  <SignalLayer signals={incomingSignals} />

  {/* === Units EXCEPT missiles === */}
  {objects
    .filter((obj) => obj.type !== "missile")
    .map((obj) => {
      if (obj.type === "defense-jammer") {
        return (
          <DefenseJammer
            key={obj.id}
            id={obj.id}
            baseid={obj.baseid}
            x={obj.x}
            y={obj.y}
            jamRadius={150}
            currentFrequency={"X-Band"}
          />
        );
      }
      if (obj.type === "interceptor")
        return <Interceptor key={obj.id} {...obj} />;
      if (obj.type === "radar")
        return (
          <Radar
            key={obj.id}
            {...obj}
            objects={objects}
            jammerReports={jammerReports}
            setJammerReports={setJammerReports}
            currentFrequency={currentFrequency}
            setCurrentFrequency={setCurrentFrequency}
            availableFrequencies={availableFrequencies}
          />
        );
      if (obj.type === "launcher")
        return (
          <Launcher
            key={obj.id}
            {...obj}
            onLaunchInterceptor={onLaunchInterceptor}
          />
        );
      if (obj.type === "antenna")
        return (
          <Antenna
            key={obj.id}
            {...obj}
            jammerReports={jammerReports}
            setJammerReports={setJammerReports}
            currentFrequency={currentFrequency}
            setCurrentFrequency={setCurrentFrequency}
            availableFrequencies={availableFrequencies}
  />
        );
      if (obj.type === "jammer")
        return <Jammer key={obj.id} {...obj} />;
      

      return null;
    })}

  {/* === Missiles on top === */}
  {objects
    .filter((obj) => obj.type === "missile")
    .map((obj) => (
      <Missile
        key={obj.id}
        x={obj.x}
        y={obj.y}
        targetX={obj.targetX}
        targetY={obj.targetY}
        speed={obj.speed}
      />
    ))}
<CentralAI x={MAP_WIDTH / 2 - 50} y={10} />

{/* Floating messages — all of them handled here */}
{floatingMessages.map((msg) => (
  <FloatingMessage key={msg.id} {...msg} />
))}

  {explosions.map((exp) => (
    <Explosion
      key={exp.id}
      x={exp.x}
      y={exp.y}
      onAnimationEnd={() => {
        setExplosions((prev) => prev.filter((e) => e.id !== exp.id));
      }}
    />
  ))}
</Layer>

    </Stage>
  );
}
