import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";

export function useLeafletToKonvaTransform({ mapInstance, baseData = [], mapSize, stageContainerRef }) {
  const [pixelPositions, setPixelPositions] = useState({});
  const [zoom, setZoom] = useState(0);
  const retryTimer = useRef(null);

  const calculatePositions = useCallback(() => {
    if (!mapInstance || !stageContainerRef?.current || mapSize.width <= 1 || mapSize.height <= 1) {
      console.log("⏳ Waiting for map & container size...");
      return null;
    }

    const updatedPixels = {};
    let allValid = true;

    const stageRect = stageContainerRef.current.getBoundingClientRect();

    baseData.forEach((base) => {
      if (!base.coords) {
        allValid = false;
        return;
      }

      // Leaflet pixel position relative to map container
      const point = mapInstance.latLngToContainerPoint(
        L.latLng(base.coords[0], base.coords[1])
      );

      // Convert to Stage coordinates
      const stageX = point.x - stageRect.left;
      const stageY = point.y - stageRect.top;

      if (stageX <= 0 || stageY <= 0) allValid = false;

      updatedPixels[base.id] = { x: stageX, y: stageY };
    });

    return { updatedPixels, allValid };
  }, [mapInstance, baseData, stageContainerRef, mapSize.width, mapSize.height]);

  const updatePositions = useCallback(() => {
    const result = calculatePositions();
    if (!result) return;

    const { updatedPixels, allValid } = result;
    console.log("🔹 Calculated base pixels (Stage coords):", updatedPixels);

    const anyNonZero = Object.values(updatedPixels).some((p) => p.x > 0 && p.y > 0);
    if (!anyNonZero) return;

    setPixelPositions(updatedPixels);
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
      updatePositions();
      setTimeout(updatePositions, 100);

      if (!retryTimer.current) {
        retryTimer.current = setInterval(() => updatePositions(), 1000);
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
