export function latLngToStageCoords(map, latlng) {
  if (!map) return { x: 0, y: 0 };

  // This returns pixel coordinates relative to the map container
  const point = map.latLngToContainerPoint(latlng);

  console.log("📦 Raw container point (stage coords):", point);

  return {
    x: point.x, // ✅ No offset needed
    y: point.y,
  };
}
