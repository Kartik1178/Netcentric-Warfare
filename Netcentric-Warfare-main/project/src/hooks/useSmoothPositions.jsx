// hooks/useSmoothPositions.js
import { useState, useEffect, useRef } from "react";

export function useSmoothPositions(targetPositions, duration = 200) {
  const [smoothPositions, setSmoothPositions] = useState(targetPositions);
  const animationRef = useRef(null);
  const prevPositionsRef = useRef(targetPositions);

  useEffect(() => {
    if (!targetPositions) return;

    const startTime = performance.now();
    const startPositions = prevPositionsRef.current;

    function animate() {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);

      const newPositions = {};
      for (const key of Object.keys(targetPositions)) {
        const target = targetPositions[key];
        const start = startPositions[key] || target; // fallback for first render

        newPositions[key] = {
          x: start.x + (target.x - start.x) * progress,
          y: start.y + (target.y - start.y) * progress,
        };
      }

      setSmoothPositions(newPositions);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevPositionsRef.current = targetPositions;
      }
    }

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [targetPositions, duration]);

  return smoothPositions;
}
