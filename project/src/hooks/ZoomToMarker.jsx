// components/ZoomToMarker.jsx
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
export default function ZoomToMarker({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 9, { animate: true });
    }
  }, [coords]);
  return null;
}
