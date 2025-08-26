import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Stage, Layer, Circle, Line } from "react-konva";
import { BASES } from "../constants/baseData";
import { generateBaseUnits } from "../hooks/GenerateBaseUnits";
import { getStyledBaseIcon } from "../utils/transparentIcon";

// Launch zones (polygon coordinates)
const LAUNCH_ZONES = [
  { polygon: [[35, 74.5], [34, 74], [33.5, 73.5], [33.5, 74.5]] },
  { polygon: [[25.5, 67.5], [25, 67], [24.5, 67], [24.5, 67.5]] }
];

function randomPointInZone(zone) {
  const latMin = Math.min(...zone.polygon.map(p => p[0]));
  const latMax = Math.max(...zone.polygon.map(p => p[0]));
  const lngMin = Math.min(...zone.polygon.map(p => p[1]));
  const lngMax = Math.max(...zone.polygon.map(p => p[1]));
  return [
    latMin + Math.random() * (latMax - latMin),
    lngMin + Math.random() * (lngMax - lngMin)
  ];
}

// --- Helper to trigger map ready events
function MapReady({ mapRef }) {
  useMapEvents({
    load: () => mapRef.current && mapRef.current.invalidateSize(),
    move: () => {},
    zoom: () => {}
  });
  return null;
}

export default function FullSimulation() {
  const mapRef = useRef();
  const containerRef = useRef();
  const [mapSize, setMapSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [objects, setObjects] = useState([]); // units + missiles
  const [interceptors, setInterceptors] = useState([]);
  const [failedUnits, setFailedUnits] = useState([]);
  const [, setForceRender] = useState(0); // for pan/zoom

  // --- Resize map
  useEffect(() => {
    const resize = () => setMapSize({
      width: containerRef.current?.clientWidth || window.innerWidth,
      height: containerRef.current?.clientHeight || window.innerHeight
    });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // --- Force re-render on pan/zoom
  useEffect(() => {
    if (!mapRef.current) return;
    const update = () => setForceRender(f => f + 1);
    mapRef.current.on("move zoom", update);
    return () => mapRef.current.off("move zoom", update);
  }, []);

  // --- Generate base units AFTER map ready
  useEffect(() => {
    if (!mapRef.current) return;
    const allUnits = BASES.flatMap(base => generateBaseUnits(base.id, base.type, 40));
    setObjects(allUnits.map(u => ({ ...u }))); // x/y are offsets from base center
  }, []);

  // --- Autonomous missile spawn
  useEffect(() => {
    if (!mapRef.current) return;
    const interval = setInterval(() => {
      const zone = LAUNCH_ZONES[Math.floor(Math.random() * LAUNCH_ZONES.length)];
      const [lat, lng] = randomPointInZone(zone);
      const targetBase = BASES[Math.floor(Math.random() * BASES.length)];
      const startPoint = mapRef.current.latLngToContainerPoint([lat, lng]);
      const targetPoint = mapRef.current.latLngToContainerPoint(targetBase.coords);

      setObjects(prev => [
        ...prev,
        {
          id: `missile-${Date.now()}`,
          type: "missile",
          x: startPoint.x,
          y: startPoint.y,
          targetX: targetPoint.x,
          targetY: targetPoint.y,
          baseId: targetBase.id,
          exploded: false
        }
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // --- Move missiles & interceptors
  useEffect(() => {
    const interval = setInterval(() => {
      // Move missiles
      setObjects(prev => prev.map(obj => {
        if (obj.type === "missile" && !obj.exploded) {
          const dx = obj.targetX - obj.x;
          const dy = obj.targetY - obj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) {
            setFailedUnits(f => [...f, obj.baseId]);
            return { ...obj, x: obj.targetX, y: obj.targetY, exploded: true };
          }
          const speed = 2;
          return { ...obj, x: obj.x + (dx / dist) * speed, y: obj.y + (dy / dist) * speed };
        }
        return obj;
      }));

      // Launch interceptors automatically
      setInterceptors(prev => {
        const newInterceptors = [];
        objects.filter(o => o.type === "missile" && !o.exploded).forEach(missile => {
          const alreadyTargeted = prev.some(i => i.targetId === missile.id);
          if (alreadyTargeted) return;

          const baseUnits = objects.filter(u => u.baseId.startsWith(missile.baseId) && !failedUnits.includes(u.baseId));
          if (baseUnits.length === 0) return;

          const launcher = baseUnits.find(u => u.type === "launcher");
          if (!launcher) return;

          const launcherBase = BASES.find(b => b.id === launcher.baseId);
          const launcherPos = mapRef.current.latLngToContainerPoint(launcherBase.coords);

          const dx = missile.x - (launcherPos.x + launcher.x);
          const dy = missile.y - (launcherPos.y + launcher.y);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 4;

          newInterceptors.push({
            id: `intc-${Date.now()}`,
            type: "interceptor",
            x: launcherPos.x + launcher.x,
            y: launcherPos.y + launcher.y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            targetId: missile.id
          });
        });
        return [...prev, ...newInterceptors];
      });

      // Move interceptors
      setInterceptors(prev =>
        prev.map(intc => {
          const target = objects.find(o => o.id === intc.targetId && !o.exploded);
          if (!target) return intc;
          const dx = target.x - intc.x;
          const dy = target.y - intc.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            setObjects(prevObjs => prevObjs.map(m => (m.id === target.id ? { ...m, exploded: true } : m)));
            return { ...intc, x: target.x, y: target.y };
          }
          return { ...intc, x: intc.x + intc.vx, y: intc.y + intc.vy };
        })
      );
    }, 30);

    return () => clearInterval(interval);
  }, [objects, failedUnits]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh", position: "relative" }}>
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={5}
        style={{ width: "100%", height: "100%" }}
        whenCreated={map => mapRef.current = map}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {BASES.map(base => (
          <Marker key={base.id} position={base.coords} icon={getStyledBaseIcon(base, false)} />
        ))}
        <MapReady mapRef={mapRef} />
      </MapContainer>

      {/* Konva overlay */}
      {mapRef.current && (
        <Stage width={mapSize.width} height={mapSize.height} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          <Layer>
            {/* Launch zones */}
            {LAUNCH_ZONES.map((zone, idx) => {
              const points = zone.polygon.flatMap(([lat, lng]) => {
                const pt = mapRef.current.latLngToContainerPoint([lat, lng]);
                return [pt.x, pt.y];
              });
              return <Line key={idx} points={points} closed stroke="purple" strokeWidth={2} dash={[4, 4]} />;
            })}

            {/* Base units */}
            {objects.filter(o => ["radar","antenna","launcher","jammer"].includes(o.type)).map(obj => {
              const base = BASES.find(b => obj.baseId.startsWith(b.id));
              if (!base) return null;
              const basePoint = mapRef.current.latLngToContainerPoint(base.coords);
              return (
                <Circle
                  key={obj.id}
                  x={basePoint.x + obj.x}
                  y={basePoint.y + obj.y}
                  radius={10}
                  fill={
                    obj.type === "radar" ? "cyan" :
                    obj.type === "antenna" ? "yellow" :
                    obj.type === "launcher" ? "green" : "orange"
                  }
                />
              );
            })}

            {/* Missiles */}
            {objects.filter(o => o.type === "missile" && !o.exploded).map(obj => (
              <Circle key={obj.id} x={obj.x} y={obj.y} radius={6} fill="red" />
            ))}

            {/* Interceptors */}
            {interceptors.map(i => (
              <Circle key={i.id} x={i.x} y={i.y} radius={5} fill="blue" />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
