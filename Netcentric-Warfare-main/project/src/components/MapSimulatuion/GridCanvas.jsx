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
    lines.push(
      <Line key={`v-${x}`} points={[x, -radius, x, radius]} stroke="rgba(0,255,255,0.3)" strokeWidth={1} />
    );
  for (let y = -radius; y <= radius; y += cellSize)
    lines.push(
      <Line key={`h-${y}`} points={[-radius, y, radius, y]} stroke="rgba(0,255,255,0.3)" strokeWidth={1} />
    );

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

const scaleByZoom = (zoom, base, min, max) => {
  const factor = zoom / 10;
  return Math.min(Math.max(base * factor, min), max);
};

// Adaptive grid logic
const getGridSize = (zoom) => {
  if (zoom < 12) return 2;
  if (zoom < 16) return 3;
  return 4;
};

const getCellPositions = (gridSize, radius) => {
  const spacing = (radius * 2) / gridSize;
  const positions = [];
  const start = -radius + spacing / 2;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = start + col * spacing;
      const y = start + row * spacing;
      positions.push([x, y]);
    }
  }
  return positions;
};

// Dynamic sub-base offsets with consistent spacing
const getSubBaseOffsets = (baseType, subBaseRadius) => {
  const padding = Math.max(10, subBaseRadius * 0.3);
  const spacing = subBaseRadius * 2 + padding;

  if (baseType === "Air" || baseType === "Sea") {
    return [
      [0, -spacing],
      [spacing * Math.cos(Math.PI / 6), spacing * Math.sin(Math.PI / 6)],
      [-spacing * Math.cos(Math.PI / 6), spacing * Math.sin(Math.PI / 6)],
    ];
  } else {
    return [
      [0, -spacing / 2],
      [0, spacing / 2],
    ];
  }
};

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
  floatingMessages,
  onBaseClick,
  onLaunchInterceptor,
  onLogsUpdate,
}) {
  const stageRef = useRef();

  const missiles = objects.filter((o) => o.type === "missile");
  const interceptors = objects.filter((o) => o.type === "interceptor");
  const baseUnits = objects.filter((o) => o.type !== "missile" && o.type !== "interceptor");

  const renderUnit = (unit, offsetX, offsetY, basePos, unitRadius) => {
    const commonProps = {
      key: unit.id,
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
      onLogsUpdate,
      radius: unitRadius,
    };

    switch (unit.type) {
      case "radar":
        return <Radar {...commonProps} absoluteX={basePos.x + offsetX + unit.x} absoluteY={basePos.y + offsetY + unit.y} />;
      case "antenna":
        return <Antenna {...commonProps} zoom={zoom} radius={unitRadius} />;
      case "jammer":
        return <DefenseJammer {...commonProps} />;
      case "launcher":
        return <Launcher {...commonProps} onLaunchInterceptor={onLaunchInterceptor} />;
      default:
        return null;
    }
  };

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
    <Stage ref={stageRef} width={width} height={height} style={{ position: "absolute", top: 0, left: 0, zIndex: 500, background: "rgba(0,0,0,0.3)", pointerEvents: "none" }}>
      <Layer>
        {Object.entries(baseZones).map(([baseId, basePos]) => {
          if (focusMode && selectedBaseId && baseId !== selectedBaseId) return null;
          if (!basePos) return null;

          const unitRadius = scaleByZoom(zoom, 12, 6, 20);
          const cellSize = scaleByZoom(zoom, 30, 20, 40);
          const baseRadius = scaleByZoom(zoom, 40, 25, 60);
          const subBaseRadius = zoom >= 12 ? baseRadius : baseRadius * 0.66;

          const mainBaseObj = baseUnits.find((u) => u.baseId === baseId);
          const baseType = mainBaseObj?.type || "Air";

          const showSubBases = zoom >= 10;
          const showUnits = zoom >= 8;

          return (
            <Group key={baseId} x={basePos.x} y={basePos.y}>
              {/* Show sub-bases only if zoom >= 10 */}
              {showSubBases &&
                getSubBaseOffsets(baseType, subBaseRadius).map(([ox, oy], i) => {
                  const subBaseId = `${baseId}-sub${i + 1}`;
                  const subUnits = baseUnits.filter((u) => u.baseId === subBaseId);

                  const gridSize = getGridSize(zoom);
                  const cellPositions = getCellPositions(gridSize, subBaseRadius);
                  const unitCellRadius = cellPositions.length ? (subBaseRadius * 2) / (gridSize * 2) : unitRadius;

                  return (
                    <Group key={subBaseId} x={ox} y={oy}>
                      <BaseGridBackground radius={subBaseRadius} cellSize={cellSize} />
                      {subUnits.map((unit, idx) => {
                        const [cx, cy] = cellPositions[idx % cellPositions.length];
                        return renderUnit({ ...unit, x: cx, y: cy }, ox, oy, basePos, unitCellRadius);
                      })}
                    </Group>
                  );
                })}

              {/* Show main base units only for zoom >=8 */}
              {!showSubBases && showUnits &&
                baseUnits.filter((u) => u.baseId === baseId).map((unit) =>
                  renderUnit(unit, 0, 0, basePos, unitRadius)
                )}
            </Group>
          );
        })}

        {/* Central AI */}
        <CentralAIUnit id="central-ai-unit" label="C2 AI" x={CENTRAL_AI_POSITION.x} y={CENTRAL_AI_POSITION.y} />

        {/* Missiles */}
        {missiles.map((m) => <Missile key={m.id} x={m.x} y={m.y} radius={scaleByZoom(zoom, 20, 8, 30)} />)}

        {/* Interceptors */}
        {interceptors.map((i) => <Interceptor key={i.id} x={i.x} y={i.y} radius={scaleByZoom(zoom, 10, 6, 20)} />)}

        {/* Explosions */}
        {explosions.map((ex, idx) => (
          <Explosion key={idx} x={ex.x} y={ex.y} onAnimationEnd={() => setExplosions(prev => prev.filter((_, i) => i !== idx))} />
        ))}

        <FloatingMessages messages={floatingMessages} />
      </Layer>
    </Stage>
  );
}
