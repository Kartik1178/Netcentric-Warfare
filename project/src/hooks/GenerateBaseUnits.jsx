import { BASES } from "../constants/baseData";

let unitCounter = 0;
const createUnit = (type, baseId, x, y) => ({
  id: `${type}-${unitCounter++}`,
  baseId,
  type,
  x,
  y,
});

// 🔹 Core generator: returns units with **local coordinates** for a sub-base
export function generateBaseUnits(baseId, type, subBaseRadius = 60) {
  const units = [];

  // Scale spacing relative to sub-base size
  const launcherSpacing = subBaseRadius * 0.5; // launchers on corners
  const innerSpacing = subBaseRadius * 0.3;    // radar, antenna, jammer closer to center

  switch (type) {
    case "Air":
      // ✅ Central Radar
      units.push(createUnit("radar", baseId, 0, -innerSpacing));

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
      units.push(createUnit("radar", baseId, 0, 0));
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
      units.push(createUnit("radar", baseId, 0, 0));
      break;
  }

  return units;
}
