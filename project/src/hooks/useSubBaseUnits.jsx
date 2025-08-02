import { useMemo } from "react";

/**
 * Scales local unit positions inside sub-bases dynamically based on zoom.
 * 
 * - Expects units to have `localX` and `localY`
 * - Returns scaled local coordinates
 */
export function useSubBaseUnits(units, zoom) {
  return useMemo(() => {
    if (!units || units.length === 0) return [];

    // 🔹 Scale unit positions dynamically based on zoom
    const spacingScale = zoom >= 15 ? 1.5 : zoom >= 13 ? 1.2 : 1;

    return units.map((unit) => ({
      ...unit,
      x: unit.localX * spacingScale, // ✅ scaled local X
      y: unit.localY * spacingScale, // ✅ scaled local Y
    }));
  }, [units, zoom]);
}
