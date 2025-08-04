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

// 🔹 Handles map clicks for missile launch
function MapClickHandler({ step, onMissileLaunch }) {
  useMapEvents({
    click(e) {
      if (step !== "launch") return;

      // ✅ Ensure click is in an allowed enemy zone
      if (!isInsideLaunchZone(e.latlng)) {
        alert("❌ Launch outside allowed zones!");
        return;
      }

      // ✅ Set fixed target (Delhi for now)
      const fixedTarget = { id: "base-fixed", coords: [28.6139, 77.209] };

      // ✅ Launch missile with the new lat/lng-based structure
      onMissileLaunch({
        id: `missile-${Date.now()}`,
        baseId: fixedTarget.id,
        startLat: e.latlng.lat,
        startLng: e.latlng.lng,
        targetLat: fixedTarget.coords[0],
        targetLng: fixedTarget.coords[1],
      });
    },
  });
  return null;
}

export default function FullMap({ step, onLogsUpdate, newJammer }) {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState([28.6139, 77.209]);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapSize, setMapSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [focusMode, setFocusMode] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [newMissile, setNewMissile] = useState(null); // ✅ Local state

  const containerRef = useRef(null);

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

  // ✅ Handle base marker click → Focus + Zoom
  const handleBaseClick = (base) => {
    setFocusMode(true);
    setSelectedBaseId(base.id);
    if (mapInstance) {
      mapInstance.flyTo(base.coords, 15, { animate: true, duration: 1.5 });
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
        <MapClickHandler step={step} onMissileLaunch={handleMissileLaunch} />

        {/* 🟢 Base Markers */}
        {mapInstance &&
          BASES.map((base) => (
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
          newJammer={newJammer}
        />
      </MapContainer>
    </div>
  );
}
