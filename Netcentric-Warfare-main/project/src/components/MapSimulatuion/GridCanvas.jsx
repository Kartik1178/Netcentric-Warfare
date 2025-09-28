import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Group, Rect, Text, Line } from "react-konva";
import Radar from "./RadarUnit";
import Antenna from "./AntennaUnit";
import Jammer from "./JammerUnit";   // <-- free-floating jammer
import Launcher from "./LauncherUnit";
import Missile from "./Missile";
import { Interceptor } from "./Interceptor";
import Explosion from "../Explosion";
import CentralAIUnit from "./CentralAIUnit";

import DefenseJammer from "./DefenseJammer"; // <-- base defense jammer
import { CENTRAL_AI_POSITION } from "../../constants/AIconstant";
import FloatingMessages from "./FloatingMessages";
import { DroneUnit } from "./DroneUnit";
import { ArtilleryUnit } from "./ArtilleryUnit";

// Orbit hook for drones
const useOrbit = (centerX, centerY, radius, speed = 0.02) => {
  const [angle, setAngle] = useState(Math.random() * Math.PI * 2);
  useEffect(() => {
    const id = setInterval(() => setAngle((a) => a + speed), 16);
    return () => clearInterval(id);
  }, [speed]);
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  return { x, y };
};

// Grid background
const BaseGridBackground = ({ radius = 150, cellSize = 30 }) => {
  const lines = [];
  for (let x = -radius; x <= radius; x += cellSize)
    lines.push(<Line key={`v-${x}`} points={[x, -radius, x, radius]} stroke="rgba(0,255,255,0.3)" />);
  for (let y = -radius; y <= radius; y += cellSize)
    lines.push(<Line key={`h-${y}`} points={[-radius, y, radius, y]} stroke="rgba(0,255,255,0.3)" />);
  return (
    <Group>
      <Rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} fill="rgba(0,20,30,0.4)" />
      {lines}
      <Rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} stroke="rgba(0,255,255,0.7)" strokeWidth={2} dash={[12,6]} />
    </Group>
  );
};

// Helpers
const scaleByZoom = (zoom, base, min, max) => Math.min(Math.max((zoom / 10) * base, min), max);
const getGridSize = (zoom) => (zoom < 12 ? 2 : zoom < 16 ? 3 : 4);
const getCellPositions = (gridSize, radius) => {
  const spacing = (radius * 2) / gridSize;
  const start = -radius + spacing / 2;
  const positions = [];
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      positions.push([start + c * spacing, start + r * spacing]);
  return positions;
};
const getSubBaseOffsets = (baseType, subBaseRadius) => {
  const padding = Math.max(10, subBaseRadius * 0.3);
  const spacing = subBaseRadius * 2 + padding;
  if (baseType === "Air" || baseType === "Sea") {
    return [
      [0, -spacing],
      [spacing * Math.cos(Math.PI / 6), spacing * Math.sin(Math.PI / 6)],
      [-spacing * Math.cos(Math.PI / 6), spacing * Math.sin(Math.PI / 6)]
    ];
  } else {
    return [
      [0, -spacing / 2],
      [0, spacing / 2]
    ];
  }
};

export default function GridCanvas(props) {
  const {
    width, height, objects, zoom, baseZones, floatingMessages,
    explosions, setExplosions, jammerReports, setJammerReports,
    currentFrequency, setCurrentFrequency, availableFrequencies,
    focusMode, selectedBaseId, onLaunchInterceptor, onLogsUpdate
  } = props;

  const stageRef = useRef();
  const tooltipRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, text: "", x: 0, y: 0 });

  const missiles = objects.filter(o => o.type === "missile");
  const interceptors = objects.filter(o => o.type === "interceptor");
  const baseUnits = objects.filter(o => o.type !== "missile" && o.type !== "interceptor" && o.type !== "jammer");
  const drones = objects.filter(o => o.type === "drone");
  const jammers = objects.filter(o => o.type === "jammer");  // free-floating jammers
  const artilleryUnits = objects.filter(o => o.type === "artillery");

  // Render a unit with hover tooltip
  const renderUnit = (unit, offsetX, offsetY, basePos, unitRadius, subBaseCenter) => {
    const commonProps = {
      key: unit.id, id: unit.id, x: unit.x, y: unit.y, baseId: unit.baseId,
      objects, jammerReports, stageContainer: stageRef.current, setJammerReports,
      currentFrequency, setCurrentFrequency, availableFrequencies, onLogsUpdate,
      radius: unitRadius, listening: true
    };

    const onMouseEnter = (e) => {
      if (!stageRef.current) return;
      const pointerPos = stageRef.current.getPointerPosition();
      setTooltip({
        visible: true,
        text: `${unit.type.toUpperCase()} | ID: ${unit.id} | Base: ${unit.baseId.split("-")[0]}`,
        x: pointerPos.x,
        y: pointerPos.y
      });
    };
    const onMouseLeave = () => setTooltip(prev => ({ ...prev, visible: false }));

    if (unit.type === "drone" && subBaseCenter) {
      const { x, y } = useOrbit(subBaseCenter.x, subBaseCenter.y, unitRadius * 2, 0.03);
      return <DroneUnit {...commonProps} x={x} y={y} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
    }

    switch(unit.type) {
      case "radar": return <Radar {...commonProps} absoluteX={basePos.x + offsetX + unit.x} absoluteY={basePos.y + offsetY + unit.y} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
      case "antenna": return <Antenna {...commonProps} zoom={zoom} radius={unitRadius} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
      case "jammer":  // <-- base DefenseJammer
        return <DefenseJammer
          {...commonProps}
          x={unit.x}
          y={unit.y}
          radius={unitRadius}
          jamRadius={unit.effectRadius || 150}
          currentFrequency={unit.frequency || "2GHz"}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />;
      case "launcher": return <Launcher {...commonProps} onLaunchInterceptor={onLaunchInterceptor} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
      default: return null;
    }
  };

  return (
    <Stage ref={stageRef} width={width} height={height} style={{ position:"absolute", top:0, left:0 }}>
      <Layer>
        {/* Bases */}
        {Object.entries(baseZones).map(([baseId, basePos]) => {
          if (focusMode && selectedBaseId && baseId !== selectedBaseId) return null;
          if (!basePos) return null;
          const unitRadius = scaleByZoom(zoom, 12, 6, 20);
          const cellSize = scaleByZoom(zoom, 30, 20, 40);
          const baseRadius = scaleByZoom(zoom, 40, 25, 60);
          const subBaseRadius = zoom >= 12 ? baseRadius : baseRadius * 0.66;
          const mainBaseObj = baseUnits.find(u => u.baseId === baseId);
          const baseType = mainBaseObj?.type || "Air";
          const showSubBases = zoom >= 10;
          const showUnits = zoom >= 8;

          return (
            <Group key={baseId} x={basePos.x} y={basePos.y}>
              {showSubBases && getSubBaseOffsets(baseType, subBaseRadius).map(([ox, oy], i) => {
                const subBaseId = `${baseId}-sub${i+1}`;
                const subUnits = baseUnits.filter(u => u.baseId === subBaseId);
                const gridSize = getGridSize(zoom);
                const cellPositions = getCellPositions(gridSize, subBaseRadius);
                const unitCellRadius = cellPositions.length ? (subBaseRadius*2)/(gridSize*2) : unitRadius;

                return (
                  <Group key={subBaseId} x={ox} y={oy}>
                    <BaseGridBackground radius={subBaseRadius} cellSize={cellSize} />
                    {subUnits.map((unit, idx) => {
                      const [cx, cy] = cellPositions[idx % cellPositions.length];
                      const subBaseCenter = {x:0,y:0};
                      return renderUnit({...unit, x:cx, y:cy}, ox, oy, basePos, unitCellRadius, subBaseCenter);
                    })}
                  </Group>
                );
              })}

              {!showSubBases && showUnits && baseUnits.filter(u=>u.baseId===baseId).map(unit => renderUnit(unit,0,0,basePos,unitRadius))}
            </Group>
          );
        })}

        {/* Central AI */}
        <CentralAIUnit id="central-ai-unit" label="C2 AI" x={CENTRAL_AI_POSITION.x} y={CENTRAL_AI_POSITION.y} />

        {/* Missiles & interceptors */}
        {missiles.map(m => <Missile key={m.id} x={m.x} y={m.y} radius={scaleByZoom(zoom,20,8,30)} />)}
        {interceptors.map(i => <Interceptor key={i.id} x={i.x} y={i.y} radius={scaleByZoom(zoom,10,6,20)} />)}

        {/* Free-floating Jammers */}
        

        {/* Drones */}
        {drones.map(d => (
          <Group key={d.id}>
            <DroneUnit
              id={d.id}        
              x={d.x}
              y={d.y}
              radius={scaleByZoom(zoom, 15, 8, 25)}
            />
            <Text
              x={d.x + 10}
              y={d.y - 10}
             text={`DRONE\n${d.id ? d.id.split("-")[1] ?? d.id : "unknown"}`}
              fontSize={12}
              fill="yellow"
              align="center"
            />
          </Group>
        ))}

        {/* Artillery */}
        {artilleryUnits.map(a => (
          <ArtilleryUnit
            key={a.id}
            x={a.x}
            y={a.y}
            radius={scaleByZoom(zoom, 18, 10, 28)}
            onClick={() => console.log("Fire artillery!", a.id)}
          />
        ))}

        {/* Explosions */}
        {explosions.map((ex, idx) => (
          <Explosion key={idx} x={ex.x} y={ex.y} onAnimationEnd={()=>setExplosions(prev => prev.filter((_,i)=>i!==idx))} />
        ))}

        {/* Tooltip */}
        {tooltip.visible && (
          <Group x={tooltip.x + 10} y={tooltip.y + 10}>
            <Text ref={tooltipRef} text={tooltip.text} fontSize={14} fill="yellow" padding={4} />
            <Rect width={tooltipRef.current ? tooltipRef.current.getTextWidth()+8 : 100} height={tooltipRef.current ? tooltipRef.current.getTextHeight()+4 : 24} fill="black" cornerRadius={4} opacity={0.7} />
          </Group>
        )}

        {/* Floating messages */}
        <FloatingMessages messages={floatingMessages} />
      </Layer>
    </Stage>
  );
}
