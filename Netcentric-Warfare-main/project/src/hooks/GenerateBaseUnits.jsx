// src/utils/generateBaseUnits.js
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

export function generateBaseUnits(baseId, type, subBaseRadius = 40, customBases = []) {
  const units = [];

// src/utils/generateBaseUnits.js
const base =
  BASES.find((b) => baseId.startsWith(b.id)) ||
  customBases.find((b) => b.id === baseId);   // 🔹 exact match for custom


const baseLat = base?.coords?.[0] || 0;
const baseLng = base?.coords?.[1] || 0;


  // helper to arrange unit types in a circle
  const arrangeCircle = (unitTypes, radius, unitSize = 12) => {
    const count = unitTypes.length;
    const angleStep = (2 * Math.PI) / count;
    return unitTypes.map((unitType, i) => {
      const angle = i * angleStep;
      const r = radius - unitSize - 5; // padding
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      return createUnit(unitType, baseId, x, y, baseLat, baseLng);
    });
  };

  switch (type) {
    case "Air":
      units.push(
        ...arrangeCircle(
          ["radar", "antenna", "jammer", "launcher", "launcher", "launcher", "launcher"],
          subBaseRadius
        )
      );
      break;
    case "Land":
      units.push(...arrangeCircle(["radar", "launcher", "launcher", "antenna"], subBaseRadius));
      break;
    case "Sea":
      units.push(...arrangeCircle(["antenna", "jammer", "launcher", "launcher", "radar"], subBaseRadius));
      break;
    default:
      units.push(createUnit("radar", baseId, 0, 0, baseLat, baseLng));
      break;
  }

  return units;
}
