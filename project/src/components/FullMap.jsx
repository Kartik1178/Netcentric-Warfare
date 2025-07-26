// components/FullMap.jsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState } from 'react';
import { BASES } from '../constants/baseData';
import { useNearestBase } from '../hooks/useNearestBase';
import TerritoryMap from './TerritoryMap';

// Configure marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

// Tracks zoom and center for zoom-based rendering logic
function MapStateUpdater({ setZoom, setCenter }) {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
    moveend: (e) => setCenter([e.target.getCenter().lat, e.target.getCenter().lng])
  });
  return null;
}

// Absolute overlay container for GridCanvas
function OverlayOnBase({ children, base }) {
  return (
    <div
      className="absolute z-10"
      style={{
        top: '50%',
        left: '50%',
        width: 1200,
        height: 800,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {children}
    </div>
  );
}

// Main component
export default function FullMap({ onLogsUpdate, newMissile, newJammer }) {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState([28.6139, 77.2090]); // Start centered on Delhi

  const nearestBase = useNearestBase(center, zoom);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="absolute inset-0 z-40"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {/* Mark all defined bases */}
        {BASES.map(base => (
          <Marker key={base.id} position={base.coords}>
            <Popup>{base.name}</Popup>
          </Marker>
        ))}

        <MapStateUpdater setZoom={setZoom} setCenter={setCenter} />
      </MapContainer>

      {nearestBase && (
        <OverlayOnBase base={nearestBase}>
         {/* <TerritoryMap
            base={nearestBase}
            onLogsUpdate={onLogsUpdate}
            newMissile={newMissile}
            newJammer={newJammer}
          /> */}
        </OverlayOnBase>
      )}
    </div>
  );
}
