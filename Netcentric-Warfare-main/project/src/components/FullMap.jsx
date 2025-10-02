import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  Marker,
} from "react-leaflet";
import TerritoryMap from "./TerritoryMap";
import * as L from "leaflet";
import { BASES } from "../constants/baseData";
import { getStyledBaseIcon } from "../utils/transparentIcon";
import MapClickHandler from "../hooks/MapClickHandler";
// 🔹 Enemy launch zones
const LAUNCH_ZONES = [
  { id: "pakistan-north", polygon: [[35.0, 74.5],[34.0, 74.0],[33.5, 73.5],[33.5, 74.5]], color: "rgba(255,0,0,0.3)", label: "Enemy Launch Zone (North Pakistan)" },
  { id: "pakistan-south", polygon: [[25.5, 67.5],[25.0, 67.0],[24.5, 67.0],[24.5, 67.5]], color: "rgba(255,50,50,0.3)", label: "Enemy Launch Zone (South Pakistan)" },
  { id: "arabian-sea", polygon: [[22.0, 65.5],[20.0, 65.5],[18.0, 67.0],[18.0, 69.0],[22.0, 69.0]], color: "rgba(255,100,0,0.25)", label: "Enemy Launch Zone (Arabian Sea)" },
  { id: "bay-of-bengal", polygon: [[17.0, 87.0],[15.0, 87.0],[13.0, 89.0],[14.0, 91.0],[17.0, 89.0]], color: "rgba(255,0,200,0.25)", label: "Enemy Launch Zone (Bay of Bengal)" },
  { id: "indian-ocean", polygon: [[10.0, 72.0],[7.0, 72.0],[6.0, 74.0],[7.0, 76.0],[10.0, 75.0]], color: "rgba(255,0,100,0.2)", label: "Enemy Launch Zone (Southern Ocean)" },
];

// 🔹 Check if click is inside a launch zone
function isInsideLaunchZone(latlng) {
  return LAUNCH_ZONES.some((zone) => {
    const polygon = L.polygon(zone.polygon);
    return polygon.getBounds().contains(L.latLng(latlng));
  });
}

function MapReadySetter({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    map.invalidateSize();
    window.__leafletMapInstance = map;
  }, [map]);
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



export default function FullMap({ step, onLogsUpdate, newJammer, mode }) {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState([28.6139, 77.209]);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapSize, setMapSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [focusMode, setFocusMode] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [newMissile, setNewMissile] = useState(null); // ✅ Local state
const [newDrone, setNewDrone] = useState(null);
const [newArtillery, setNewArtillery] = useState(null);
const [selectedSpawnType, setSelectedSpawnType] = useState("missile");
const [customBases, setCustomBases] = useState([]);

// ✅ Add new states
const [showBasePopup, setShowBasePopup] = useState(false);
const [newBaseType, setNewBaseType] = useState(null);
const [placingNewBase, setPlacingNewBase] = useState(false);

useEffect(() => {
  if (mode) {
    setSelectedSpawnType(mode);
    console.log(`[FullMap] Mode updated to: ${mode}`);
  }
}, [mode]);
  const containerRef = useRef(null);
  useEffect(() => {
    if (newDrone) {
      console.log("[FullMap] Received newDrone:", newDrone);
    }
  }, [newDrone]);

  useEffect(() => {
    if (newArtillery) {
      console.log("[FullMap] Received newArtillery:", newArtillery);
    }
  }, [newArtillery]);
  // ✅ Handle missile launch
  const handleMissileLaunch = (missile) => {
    setNewMissile(missile); // ✅ Trigger TerritoryMap spawn

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "FullMap",
      type: "launch",
      message: `Missile launched from [${missile.startLat.toFixed(2)}, ${missile.startLng.toFixed(2)}] targeting ${missile.baseId}`,
      payload: missile,
    });
  };
const handleBaseClick = (base) => {
  setFocusMode(true);
  setSelectedBaseId(base.id);

  if (mapInstance) {
    const targetZoom = 15;
    const currentZoom = mapInstance.getZoom();

    // ✅ If already at 15, force a slightly lower first to re-trigger animation
    if (currentZoom === targetZoom) {
      mapInstance.setZoom(targetZoom - 1, { animate: false });
    }

    mapInstance.flyTo(base.coords, targetZoom, {
      animate: true,
      easeLinearity: 0.25, // Smooth zoom
    });

    // Force redraw after move
    mapInstance.once("moveend", () => {
      mapInstance.invalidateSize();
    });
  }
};


  // Resize logic
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
{/* ➕ Add Base Button */}
<div className="absolute top-4 right-4 z-[1000]">
  <button
    onClick={() => setShowBasePopup(true)}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700"
  >
    ➕ Add Base
  </button>
</div>
{/* Base Type Popup */}
{showBasePopup && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[2000]">
    <div className="bg-white p-6 rounded-lg shadow-lg w-80">
      <h2 className="text-lg font-bold mb-4">Select Base Type</h2>
      <div className="flex flex-col gap-2">
        {["Air", "Land", "Sea"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setNewBaseType(t);
              setShowBasePopup(false);
              setPlacingNewBase(true);
            }}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            {t} Base
          </button>
        ))}
      </div>
    </div>
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
  placingNewBase={placingNewBase}
  setPlacingNewBase={setPlacingNewBase}       // ✅ tell MapClickHandler we're placing a base
  newBaseType={newBaseType}             // ✅ which type
  setCustomBases={setCustomBases}       // ✅ update custom bases
  onLogsUpdate={onLogsUpdate}           // ✅ logging
  onSpawn={(spawnData) => {
    // If it was a new base, MapClickHandler already handled it, just reset flags
    if (placingNewBase) {
      setPlacingNewBase(false);
      setNewBaseType(null);
      return;
    }

    // Otherwise normal spawn handling
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
        newJammer?.(spawnData);
        break;
    }

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "FullMap",
      type: "spawn",
      message: `${spawnData.type} spawned at [${spawnData.startLat.toFixed(2)}, ${spawnData.startLng.toFixed(2)}]`,
      payload: spawnData,
    });
  }}
/>



        {/* 🟢 Base Markers */}
       {mapInstance &&
  [...BASES, ...customBases].map((base) => (
    <Marker
      key={base.id}
      position={base.coords}
      icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
      eventHandlers={{ click: () => handleBaseClick(base) }}
    />
  ))}


        {/* 🎨 Konva Canvas Overlay */}
        <TerritoryMap
          mapInstance={mapInstance}
          mapSize={mapSize}
          zoom={zoom}
          center={center}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          selectedBaseId={selectedBaseId}
          setSelectedBaseId={setSelectedBaseId}
          onLogsUpdate={onLogsUpdate}
          newMissile={newMissile} // ✅ Pass updated missile
          newDrone={newDrone}         // ✅ Drone state
  newArtillery={newArtillery}
          newJammer={newJammer}
        />
      </MapContainer>
    </div>
  );
}
