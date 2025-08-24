// src/utils/coordinateUtils.js
export function normalizeLaunchToLatLng(launchData, mapInstance) {
  const hasLatLng =
    launchData.launcherLat != null && launchData.launcherLng != null &&
    launchData.targetLat   != null && launchData.targetLng   != null;

  if (hasLatLng) return launchData;

  const hasXY =
    launchData.launcherX != null && launchData.launcherY != null &&
    launchData.targetX   != null && launchData.targetY   != null;

  if (hasXY && mapInstance) {
    const a = mapInstance.containerPointToLatLng([launchData.launcherX, launchData.launcherY]);
    const b = mapInstance.containerPointToLatLng([launchData.targetX,   launchData.targetY]);
    return {
      ...launchData,
      launcherLat: a.lat,
      launcherLng: a.lng,
      targetLat:   b.lat,
      targetLng:   b.lng,
    };
  }

  console.warn("[Interceptor] Missing coordinates in launchData:", launchData);
  return null; // will no-op safely
}
