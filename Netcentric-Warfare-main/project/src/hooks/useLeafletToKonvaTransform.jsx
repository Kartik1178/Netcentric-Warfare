import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";

export function useLeafletToKonvaTransform({ mapInstance, baseData = [], mapSize }) {
  const [pixelPositions, setPixelPositions] = useState({});
  const [zoom, setZoom] = useState(0);
  const retryTimer = useRef(null);

  const calculatePositions = useCallback(() => {
    if (!mapInstance || mapSize.width <= 1 || mapSize.height <= 1) {
      console.log("⏳ Waiting for map & container size...");
      return null;
    }

    const updatedPixels = {};
    let allValid = true;

    baseData.forEach((base) => {
      if (!base.coords) {
        allValid = false;
        return;
      }

      const point = mapInstance.latLngToContainerPoint(
        L.latLng(base.coords[0], base.coords[1])
      );

      if (point.x <= 0 || point.y <= 0) allValid = false;

      updatedPixels[base.id] = { x: point.x, y: point.y };
    });

    return { updatedPixels, allValid };
  }, [mapInstance, mapSize.width, mapSize.height, baseData]);

  const updatePositions = useCallback(() => {
    const result = calculatePositions();
    if (!result) return;

    const { updatedPixels, allValid } = result;


    const anyNonZero = Object.values(updatedPixels).some((p) => p.x > 0 && p.y > 0);
    if (!anyNonZero) return;

    if (JSON.stringify(updatedPixels) !== JSON.stringify(pixelPositions)) {
  setPixelPositions(updatedPixels);
}

    setZoom(mapInstance.getZoom());

    if (allValid && retryTimer.current) {
      clearInterval(retryTimer.current);
      retryTimer.current = null;
      console.log("🟢 All base positions valid → stop retrying");
    }
  }, [calculatePositions, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;

    const onReady = () => {
      console.log("✅ Leaflet map ready → calculating base positions...");
      updatePositions();

      setTimeout(updatePositions, 100);

      if (!retryTimer.current) {
        retryTimer.current = setInterval(() => {
          console.log("🔄 Retrying base pixel calculation...");
          updatePositions();
        }, 1000);
      }
    };

    mapInstance.whenReady(onReady);
    mapInstance.on("zoomend moveend", updatePositions);

    return () => {
      mapInstance.off("zoomend", updatePositions);
      mapInstance.off("moveend", updatePositions);
      if (retryTimer.current) clearInterval(retryTimer.current);
    };
  }, [mapInstance, updatePositions]);

  useEffect(() => {
    if (mapInstance) updatePositions();
  }, [mapSize.width, mapSize.height, mapInstance, updatePositions]);

  return { pixelPositions, zoom, updatePositions };
}
