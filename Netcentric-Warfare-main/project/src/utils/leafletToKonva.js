export function latLngToStageCoords(map, latlng, stageContainer) {
  if (!map || !stageContainer) return { x: 0, y: 0 };

  const point = map.latLngToContainerPoint(latlng);
  const stageRect = stageContainer.getBoundingClientRect();

  return {
    x: point.x - stageRect.left,
    y: point.y - stageRect.top,
  };
}
