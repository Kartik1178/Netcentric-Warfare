import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  Polygon,
  Tooltip,
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

// 🔹 Check click is inside launch zone
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

function MapClickHandler({ step, onMissileLaunch }) {
  useMapEvents({
    click(e) {
      if (step !== "launch") return;

      if (!isInsideLaunchZone(e.latlng)) {
        alert("❌ Launch outside allowed zones!");
        return;
      }

      const fixedTarget = { id: "base-fixed", coords: [28.6139, 77.209] };

      onMissileLaunch({
        latlng: e.latlng,
        nearestBase: fixedTarget,
      });
    },
  });
  return null;
}

export default function FullMap({
  step,
  onMissileLaunch,
  onLogsUpdate,
  newMissile,
  newJammer,
}) {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState([28.6139, 77.209]); // Delhi
  const [mapInstance, setMapInstance] = useState(null);
  const [mapSize, setMapSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [focusMode, setFocusMode] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(null);

  const containerRef = useRef(null);

  // 🔹 Resize listener
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
        <MapClickHandler step={step} onMissileLaunch={onMissileLaunch} />

        {/* 🟢 Leaflet Base Markers (Now Interactive) */}
        {mapInstance &&
          BASES.map((base) => (
            <Marker
              key={base.id}
              position={base.coords}
              icon={getStyledBaseIcon(base, focusMode && selectedBaseId === base.id)}
              eventHandlers={{
                click: () => {
                  setFocusMode(true);
                  setSelectedBaseId(base.id);
                  mapInstance.flyTo(base.coords, 15, { animate: true, duration: 1.5 });
                },
              }}
            />
          ))}

        {/* 🔹 Highlight Launch Zones */}
        {step === "launch" &&
          LAUNCH_ZONES.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              pathOptions={{
                color: "red",
                weight: 3,
                dashArray: "6 8",
                fillColor: zone.color,
                fillOpacity: 0.45,
              }}
            >
              <Tooltip sticky>{zone.label}</Tooltip>
            </Polygon>
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
          onLogsUpdate={onLogsUpdate}
          newMissile={newMissile}
          newJammer={newJammer}
        />
      </MapContainer>
    </div>
  );
}
