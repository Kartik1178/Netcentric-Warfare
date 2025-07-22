// hooks/useBaseUnitLayout.js

export function generateBaseUnits(base, BASE_SIZE = 300) {
  const units = [];

  const { x: baseX, y: baseY } = base.position;
  const halfSize = BASE_SIZE / 2;


  units.push({
    type: "radar",
      baseid: base.id,
    id: `${base.id}_radar`,
    x: baseX,
    y: baseY,
  });

  units.push({
    type: "antenna",
      baseid: base.id,
    id: `${base.id}_antenna`,
    x: baseX + 40,
    y: baseY - 40,
  });
units.push({
  type: "defense-jammer", 
  baseid: base.id,
  id: `${base.id}_jammer`,
  x: baseX - 50,
  y: baseY + 50,
});
 
  const numLaunchers = 2;
  const launcherRadius = BASE_SIZE / 3;

  for (let i = 0; i < numLaunchers; i++) {
    const angle = (2 * Math.PI * i) / numLaunchers;
    const lx = baseX + launcherRadius * Math.cos(angle) + (Math.random() - 0.5) * 10;
    const ly = baseY + launcherRadius * Math.sin(angle) + (Math.random() - 0.5) * 10;

    units.push({
      type: "launcher",
        baseid: base.id,
      id: `${base.id}_launcher_${i}`,
      x: lx,
      y: ly,
    });
  }

  return units;
}
