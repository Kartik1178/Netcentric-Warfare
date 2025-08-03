import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import TerritoryMap from "./TerritoryMap";

function MapReadySetter({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    window.__leafletMapInstance = map; // ✅ Store globally for missile launch
    console.log("✅ MapReadySetter: Map instance ready", map);
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

function MapClickHandler({ step, onMissileLaunch, mapInstance }) {
  useMapEvents({
    click(e) {
      if (step !== "launch") return;
 console.log("🟢 Map clicked at LatLng:", e.latlng);
      console.log("🟢 Map container point:", mapInstance.latLngToContainerPoint(e.latlng));
      const fixedTarget = { id: "base-fixed", coords: [28.6139, 77.209] };

      // ✅ Pass LatLng and nearestBase
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
  const [mapSize, setMapSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [focusMode, setFocusMode] = useState(false);

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

  // 🔹 Ensure Leaflet resizes correctly
  useEffect(() => {
    if (mapInstance) {
      mapInstance.invalidateSize();
      setTimeout(() => mapInstance.invalidateSize(), 200);
    }
  }, [mapInstance, mapSize]);

  return (
    <div ref={containerRef} className="w-full h-screen relative">
      {step === "launch" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/70 px-4 py-2 rounded-lg text-white font-semibold">
          Click on the map to select missile launch position
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
          onMissileLaunch={onMissileLaunch}
          mapInstance={mapInstance}
        />

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
