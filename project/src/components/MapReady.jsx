import { useMap } from "react-leaflet";
import { useEffect } from "react";

function MapReady({ onReady }) {
  const map = useMap();

  useEffect(() => {
    console.log("✅ Leaflet map ready via useMap:", map);
    onReady(map);
  }, [map]);

  return null;
}
