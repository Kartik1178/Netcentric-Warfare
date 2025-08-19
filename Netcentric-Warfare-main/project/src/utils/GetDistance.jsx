// utils/GetDistance.js

// IMPORTANT: Calibrate this value!
// This constant defines how many kilometers 1 pixel represents on your Konva canvas.
// This value depends heavily on your Leaflet map's projection and zoom level.
// You will likely need to adjust this through experimentation.
// A common starting point for a global map might be 0.1 to 1.0 km/pixel,
// but for zoomed-in views, it will be much smaller.
const PIXEL_TO_KM_SCALE = 0.1; // Placeholder: 1 pixel = 0.1 km. ADJUST THIS!

export function getDistance(point1, point2) {
  // Debug log to see the exact inputs to getDistance
  console.log(`[getDistance Utility] Received P1: ${JSON.stringify(point1)}, P2: ${JSON.stringify(point2)}`);

  // --- Haversine formula for Latitude/Longitude (returns distance in KM) ---
  if (point1.lat != null && point1.lng != null && point2.lat != null && point2.lng != null) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceInKm = R * c;

    console.log(`[getDistance Utility] Calculated Lat/Lng distance: ${distanceInKm.toFixed(2)}km`);
    return distanceInKm;
  }
  // --- Euclidean distance for X/Y pixels (returns distance in pixels, then converted to KM) ---
  else if (point1.x != null && point1.y != null && point2.x != null && point2.y != null) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const distanceInPixels = Math.sqrt(dx * dx + dy * dy);
    
    // Convert pixel distance to kilometers using the defined scale
    const distanceInKm = distanceInPixels * PIXEL_TO_KM_SCALE; 

    console.log(`[getDistance Utility] Calculated X/Y distance. dx: ${dx.toFixed(2)}, dy: ${dy.toFixed(2)}, Pixels: ${distanceInPixels.toFixed(2)}, KM: ${distanceInKm.toFixed(2)}`);
    return distanceInKm;
  }
  // --- Fallback for invalid input ---
  console.warn("[getDistance Utility] Invalid input: Missing required coordinates (lat/lng or x/y) for distance calculation. Returning NaN.");
  return NaN;
}
