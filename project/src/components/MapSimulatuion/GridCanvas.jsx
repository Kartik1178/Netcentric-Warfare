import React from "react";
import { Stage, Layer, Rect, Line, Text } from "react-konva";
import Missile from "./Missile";
import Radar from "./RadarUnit";
import Launcher from "./LauncherUnit";
import Antenna from "./AntennaUnit";
import Jammer from "./JammerUnit";
const MAP_WIDTH = 1000;
const MAP_HEIGHT = window.innerHeight * 0.9; // 3/4 of viewport height

const CELL_SIZE = 25; // smaller grid cells
const BASE_SIZE = 300; // proportional to smaller cells
const BUFFER_RADIUS = 400; // proportional buffer around base

const BASE_START_X = (MAP_WIDTH - BASE_SIZE) / 2;
const BASE_START_Y = (MAP_HEIGHT - BASE_SIZE) / 2;
export default function GridCanvas({ objects = [] }) {
  return (
    <Stage width={MAP_WIDTH} height={MAP_HEIGHT}>
    <Layer>
      {/* Background */}
      <Rect
        x={0}
        y={0}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        fill="#0a0a1f" // background
      />
  
      {/* Grid */}
      {Array.from({ length: Math.ceil(MAP_WIDTH / CELL_SIZE) }).map((_, i) => (
        <Line
          key={`v-${i}`}
          points={[i * CELL_SIZE, 0, i * CELL_SIZE, MAP_HEIGHT]}
          stroke="#2d2d2d" // grid lines
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
  
      {/* Buffer Zone */}
      <Rect
        x={(MAP_WIDTH - BUFFER_RADIUS) / 2}
        y={(MAP_HEIGHT - BUFFER_RADIUS) / 2}
        width={BUFFER_RADIUS}
        height={BUFFER_RADIUS}
        stroke="#3b9eff" // electric blue
        dash={[10, 10]}
        strokeWidth={2}
      />
  
      {/* Military Base */}
      <Rect
        x={BASE_START_X}
        y={BASE_START_Y}
        width={BASE_SIZE}
        height={BASE_SIZE}
        fill="#3b5323"       // base color
        stroke="#ffffff"     // white border
        strokeWidth={3}
      />
      <Text
        text="Military Base"
        x={BASE_START_X + 10}
        y={BASE_START_Y + BASE_SIZE / 2 - 10}
        fontSize={18}
        fill="#f0f0f0" // light text
      />
       {objects.map((obj, i) => {
          if (obj.type === "missile") return <Missile key={obj.id || i} {...obj} />;
          if (obj.type === "radar") return <Radar key={obj.id || i} {...obj} objects={objects} />;
          if (obj.type === "launcher") return <Launcher key={obj.id || i} {...obj} />;
          if (obj.type === "jammer") return <Jammer key={obj.id || i} {...obj} />;
          if (obj.type === "antenna") return <Antenna key={obj.id || i} {...obj} />;
          return null;
        })}
    </Layer>
  </Stage>
  
  );
} 