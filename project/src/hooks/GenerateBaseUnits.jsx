// hooks/useBaseUnitLayout.js
export function generateBaseUnits(base, BASE_SIZE = 300) {
  const units = [];
  const halfSize = BASE_SIZE / 2;

  // Radar (center)
  units.push({
    type: "radar",
    baseId: base.id,
    id: `${base.id}_radar`,
    x: 0, // ✅ Relative
    y: 0,
  });

  // Antenna (top-right)
  units.push({
    type: "antenna",
    baseId: base.id,
    id: `${base.id}_antenna`,
    x: halfSize * 0.3,
    y: -halfSize * 0.3,
  });

  // Jammer (bottom-left)
  units.push({
    type: "jammer", // ✅ Match GridCanvas switch
    baseId: base.id,
    id: `${base.id}_jammer`,
    x: -halfSize * 0.3,
    y: halfSize * 0.3,
  });

  // Launchers (circle around base)
  const numLaunchers = 2;
  const launcherRadius = BASE_SIZE / 3;
  for (let i = 0; i < numLaunchers; i++) {
    const angle = (2 * Math.PI * i) / numLaunchers;
    units.push({
      type: "launcher",
      baseId: base.id,
      id: `${base.id}_launcher_${i}`,
      x: launcherRadius * Math.cos(angle), // ✅ Relative
      y: launcherRadius * Math.sin(angle),
    });
  }

  return units;
}
