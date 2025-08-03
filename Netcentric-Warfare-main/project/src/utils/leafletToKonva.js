export function latLngToStageCoords(map, latlng) {
  if (!map) return { x: 0, y: 0 };

  const container = map.getContainer();
  const bounds = container.getBoundingClientRect();
  const point = map.latLngToContainerPoint(latlng);

  console.log("📦 Map container bounds:", bounds);
  console.log("📦 Raw container point:", point);

  return {
    x: point.x + bounds.left,
    y: point.y + bounds.top,
  };
}
