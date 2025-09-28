import { BASES } from "../constants/baseData";

/**
 * Returns the nearest base to a given lat/lng
 * @param {number} lat - latitude of the spawn point
 * @param {number} lng - longitude of the spawn point
 * @param {string[]} filterTypes - optional, filter bases by type (e.g., ["Air", "Land", "Sea"])
 * @returns {object} nearest base object from BASES
 */
export function findNearestBase(lat, lng, filterTypes = []) {
  let nearest = null;
  let minDist = Infinity;

  BASES.forEach(base => {
    if (filterTypes.length && !filterTypes.includes(base.type)) return;

    const [bLat, bLng] = base.coords;
    // Using simple squared Euclidean distance (good enough for small distances)
    const dist = (lat - bLat) ** 2 + (lng - bLng) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = base;
    }
  });

  return nearest;
}
