import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import TerritoryMap from "./TerritoryMap";

// 🔁 Hook to get the map instance from inside the map
function MapReadySetter({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    console.log("✅ MapReadySetter fired with map:", map);
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

export default function FullMap({ onLogsUpdate, newMissile, newJammer }) {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState([28.6139, 77.209]); // Delhi
  const [mapInstance, setMapInstance] = useState(null);
  const [mapSize, setMapSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  console.log('EEE')
  const [focusMode, setFocusMode] = useState(false);

  const containerRef = useRef(null);

  // 🔹 Resize listener
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;
      console.log("📏 Container size updated:", width, height);
      setMapSize({ width, height });
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // 🔁 Recalculate map size on container/map change
  useEffect(() => {
    if (mapInstance) {
      mapInstance.invalidateSize();
      setTimeout(() => mapInstance.invalidateSize(), 200);
    }
  }, [mapInstance, mapSize]);

  console.log("🟢 FullMap Rendered Object");
  console.log("🔹 mapInstance available?", !!mapInstance);

  return (
    <div ref={containerRef} className="w-full h-screen relative">
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

        {/* ✅ TerritoryMap now lives inside MapContainer */}
        <TerritoryMap
          mapInstance={mapInstance}
          mapSize={mapSize}
          zoom={zoom}
          center={center}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          onLogsUpdate={onLogsUpdate}
          newMissile={newMissile}
          newJammer={newJammer}
        />
      </MapContainer>
    </div>
  );
}
