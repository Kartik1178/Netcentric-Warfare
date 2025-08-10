import { BASES } from "../constants/baseData";

let unitCounter = 0;
const createUnit = (type, baseId, x, y, lat = null, lng = null) => ({
  id: `${type}-${unitCounter++}`,
  baseId,
  type,
  x,
  y,
  lat,
  lng,
});

// 🔹 Core generator: returns units with **local coordinates** for a sub-base
export function generateBaseUnits(baseId, type, subBaseRadius = 60) {
  const units = [];

  // Scale spacing relative to sub-base size
  const launcherSpacing = subBaseRadius * 0.5; // launchers on corners
  const innerSpacing = subBaseRadius * 0.3;    // radar, antenna, jammer closer to center

  // Get base coordinates for radar units
  const base = BASES.find(b => b.id === baseId.replace('-sub1', '').replace('-sub2', '').replace('-sub3', '').replace('-sub4', ''));
  const baseLat = base?.coords?.[0] || 0;
  const baseLng = base?.coords?.[1] || 0;

  switch (type) {
    case "Air":
      // ✅ Central Radar with lat/lng coordinates
      units.push(createUnit("radar", baseId, 0, -innerSpacing, baseLat, baseLng));

      // ✅ Antenna (left) + Jammer (right)
      units.push(createUnit("antenna", baseId, -innerSpacing, 0));
      units.push(createUnit("jammer", baseId, innerSpacing, 0));

      // ✅ 4 Launchers in a diamond/square layout
      [-1, 1].forEach((x) => {
        [-1, 1].forEach((y) => {
          units.push(createUnit("launcher", baseId, x * launcherSpacing, y * launcherSpacing));
        });
      });
      break;

    case "Land":
      // Land base has Radar at center + 2 launchers
      units.push(createUnit("radar", baseId, 0, 0, baseLat, baseLng));
      units.push(createUnit("launcher", baseId, -launcherSpacing, launcherSpacing));
      units.push(createUnit("launcher", baseId, launcherSpacing, -launcherSpacing));
      break;

    case "Sea":
      // Sea base has Antenna center + Jammer + 2 launchers
      units.push(createUnit("antenna", baseId, 0, 0));
      units.push(createUnit("jammer", baseId, innerSpacing, 0));
      units.push(createUnit("launcher", baseId, -launcherSpacing, 0));
      units.push(createUnit("launcher", baseId, launcherSpacing, 0));
      break;

    default:
      // Fallback: single radar
      units.push(createUnit("radar", baseId, 0, 0, baseLat, baseLng));
      break;
  }

  return units;
}
