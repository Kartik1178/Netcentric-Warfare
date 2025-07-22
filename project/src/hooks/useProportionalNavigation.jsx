export function proportionalNavigation({
  x,
  y,
  target,
  speed,
  heading,
  prevLosAngle,
  N = 6,
}) {
  const dx = target.x - x;
  const dy = target.y - y;
  const losAngle = Math.atan2(dy, dx);

  let losRate = losAngle - prevLosAngle;
  if (losRate > Math.PI) losRate -= 2 * Math.PI;
  if (losRate < -Math.PI) losRate += 2 * Math.PI;

  const turnRate = N * losRate;
  const newHeading = heading + turnRate;

  const vx = speed * Math.cos(newHeading);
  const vy = speed * Math.sin(newHeading);

  return {
    newX: x + vx,
    newY: y + vy,
    newHeading,
    newPrevLosAngle: losAngle,
  };
}
