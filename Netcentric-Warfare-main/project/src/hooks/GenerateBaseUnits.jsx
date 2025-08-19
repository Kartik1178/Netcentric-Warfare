import { BASES } from "../constants/baseData";

let unitCounter = 0;
// This function correctly accepts lat and lng
const createUnit = (type, baseId, x, y, lat = null, lng = null) => ({
  id: `${type}-${unitCounter++}`,
  baseId,
  type,
  x,
  y,
  lat, // This will now receive baseLat
  lng, // This will now receive baseLng
});

// 🔹 Core generator: returns units with **local coordinates** for a sub-base
export function generateBaseUnits(baseId, type, subBaseRadius = 60) {
  const units = [];

  // Scale spacing relative to sub-base size
  const launcherSpacing = subBaseRadius * 0.5; // launchers on corners
  const innerSpacing = subBaseRadius * 0.3;    // radar, antenna, jammer closer to center

  // Get base coordinates for all units in this sub-base
  // This correctly strips the sub-base suffix to find the main base
  const mainBaseId = baseId.replace('-sub1', '').replace('-sub2', '').replace('-sub3', '').replace('-sub4', '');
  const base = BASES.find(b => b.id === mainBaseId);
  const baseLat = base?.coords?.[0] || 0;
  const baseLng = base?.coords?.[1] || 0;

  switch (type) {
    case "Air":
      // ✅ All units now explicitly pass baseLat and baseLng
      units.push(createUnit("radar", baseId, 0, -innerSpacing, baseLat, baseLng));
      units.push(createUnit("antenna", baseId, -innerSpacing, 0, baseLat, baseLng));
      units.push(createUnit("jammer", baseId, innerSpacing, 0, baseLat, baseLng));
      [-1, 1].forEach((x) => {
        [-1, 1].forEach((y) => {
          units.push(createUnit("launcher", baseId, x * launcherSpacing, y * launcherSpacing, baseLat, baseLng));
        });
      });
      break;

    case "Land":
      // ✅ All units now explicitly pass baseLat and baseLng
      units.push(createUnit("radar", baseId, 0, 0, baseLat, baseLng));
      units.push(createUnit("antenna", baseId, innerSpacing, 0, baseLat, baseLng)); // Added antenna for Land bases, with coords
      units.push(createUnit("launcher", baseId, -launcherSpacing, launcherSpacing, baseLat, baseLng));
      units.push(createUnit("launcher", baseId, launcherSpacing, -launcherSpacing, baseLat, baseLng));
      break;

    case "Sea":
      // ✅ All units now explicitly pass baseLat and baseLng
      units.push(createUnit("antenna", baseId, 0, 0, baseLat, baseLng));
      units.push(createUnit("jammer", baseId, innerSpacing, 0, baseLat, baseLng));
      units.push(createUnit("launcher", baseId, -launcherSpacing, 0, baseLat, baseLng));
      units.push(createUnit("launcher", baseId, launcherSpacing, 0, baseLat, baseLng));
      units.push(createUnit("radar", baseId, -innerSpacing, 0, baseLat, baseLng)); // Added radar for Sea bases, with coords
      break;

    default:
      // Fallback: single radar
      units.push(createUnit("radar", baseId, 0, 0, baseLat, baseLng));
      break;
  }

  return units;
}
