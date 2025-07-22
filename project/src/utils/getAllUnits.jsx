
export function getAllUnitsFromBases(bases) {
  return bases.flatMap(base => base.units);
}
