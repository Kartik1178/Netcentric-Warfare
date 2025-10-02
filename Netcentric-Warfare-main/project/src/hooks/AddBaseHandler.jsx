// src/hooks/AddBaseHandler.jsx
import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";

export default function AddBaseHandler({ placingBase, setPlacingBase, selectedBaseType, onBaseAdd }) {
  useMapEvents({
    click(e) {
      if (!placingBase) return;
      const { lat, lng } = e.latlng;

      const newBase = {
        id: `custom-base-${Date.now()}`,
        name: `Custom ${selectedBaseType} Base`,
        coords: [lat, lng],
        type: selectedBaseType,
      };

      console.log("[AddBaseHandler] user clicked to place base:", newBase);
      onBaseAdd(newBase);

      // exit placement mode
      setPlacingBase(false);
    },
  });

  // nothing to render
  return null;
}
