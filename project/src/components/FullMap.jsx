// FullMap.jsx
import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  useMap,
  Marker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import TerritoryMap from "./TerritoryMap";
import * as L from "leaflet";
import { BASES } from "../constants/baseData";
import { getStyledBaseIcon } from "../utils/transparentIcon";
import MapClickHandler from "../hooks/MapClickHandler";

// ... LAUNCH_ZONES and helpers unchanged ...

function MapReadySetter({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    map.invalidateSize();
    window.__leafletMapInstance = map;
  }, [map, onMapReady]);
  return null;
}

function MapStateUpdater({ setZoom, setCenter }) {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
    moveend: (e) => {
      const c = e.target.getCenter();
      setCenter([c.lat, c.lng]);
    },
  });
  return null;
}

export default function FullMap({ step, onLogsUpdate, mode }) {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState([28.6139, 77.209]);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapSize, setMapSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [focusMode, setFocusMode] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(null);

  // transient spawn props (latest only)
  const [newMissile, setNewMissile] = useState(null);
  const [newDrone, setNewDrone] = useState(null);
  const [newArtillery, setNewArtillery] = useState(null);
  const [newJammer, setNewJammer] = useState(null);

  const [selectedSpawnType, setSelectedSpawnType] = useState("missile");
  useEffect(() => {
    if (mode) setSelectedSpawnType(mode);
  }, [mode]);

  const containerRef = useRef(null);
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      setMapSize({
        width: containerRef.current.clientWidth || window.innerWidth,
        height: containerRef.current.clientHeight || window.innerHeight,
      });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen relative">
      {step === "launch" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/80 px-6 py-3 rounded-lg text-white font-bold shadow-lg border-2 border-white animate-pulse">
          🔴 Launch Mode: Click inside highlighted ENEMY ZONES to fire a missile
        </div>
      )}

      <MapContainer
        style={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        scrollWheelZoom
        dragging
        className="z-40"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        <MapStateUpdater setZoom={setZoom} setCenter={setCenter} />
        <MapReadySetter onMapReady={setMapInstance} />

        <MapClickHandler
          step={step}
          selectedSpawnType={selectedSpawnType}
          onSpawn={(spawnData) => {
            // IMPORTANT: spawnData should include { type, startLat, startLng, ... }
            switch (spawnData.type) {
              case "missile":
                setNewMissile(spawnData);
                break;
              case "drone":
                setNewDrone(spawnData);
                break;
              case "artillery":
                setNewArtillery(spawnData);
                break;
              case "jammer":
                // Pass spawnData directly (use startLat/startLng naming for uniformity)
                setNewJammer(spawnData);
                break;
              default:
                break;
            }

            onLogsUpdate?.({
              timestamp: new Date().toLocaleTimeString(),
              source: "FullMap",
              type: "spawn",
              message: `${spawnData.type} spawned at [${(spawnData.startLat ?? spawnData.lat).toFixed(2)}, ${(spawnData.startLng ?? spawnData.lng).toFixed(2)}]`,
              payload: spawnData,
            });
          }}
        />

        {/* Base Markers */}
        {mapInstance &&
          BASES.map((base) => (
            <Marker
              key={base.id}
              position={base.coords}
              icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
              eventHandlers={{ click: () => {
                setFocusMode(true);
                setSelectedBaseId(base.id);
                if (mapInstance) {
                  const targetZoom = 15;
                  const currentZoom = mapInstance.getZoom();
                  if (currentZoom === targetZoom) mapInstance.setZoom(targetZoom - 1, { animate: false });
                  mapInstance.flyTo(base.coords, targetZoom, { animate: true, easeLinearity: 0.25 });
                  mapInstance.once("moveend", () => mapInstance.invalidateSize());
                }
              } }}
            />
          ))}

        {/* TerritoryMap overlay — pass setters so it can clear transient spawns */}
        <TerritoryMap
          mapInstance={mapInstance}
          mapSize={mapSize}
          zoom={zoom}
          center={center}
          focusMode={focusMode}
          selectedBaseId={selectedBaseId}
          onLogsUpdate={onLogsUpdate}

          newMissile={newMissile}
          setNewMissile={setNewMissile}

          newDrone={newDrone}
          setNewDrone={setNewDrone}

          newArtillery={newArtillery}
          setNewArtillery={setNewArtillery}

          newJammer={newJammer}
          setNewJammer={setNewJammer}
        />
      </MapContainer>
    </div>
  );
}
