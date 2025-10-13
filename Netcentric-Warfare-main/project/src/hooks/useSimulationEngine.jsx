import { useEffect, useRef } from "react";

/**
 * Simulation engine hook
 * Automatically handles radar detection and interceptor launches
 */
export function useSimulationEngine({
  enabled,
  allUnits,
  missiles,
  setActiveInterceptors,
  centralAI,
  mapInstance, // optional, for explosions if needed
  setExplosions,
}) {
  const intervalRef = useRef();

  // Keep a ref to centralAI.pendingInterceptions to avoid stale closures
  const pendingRef = useRef([]);
  if (!centralAI.pendingInterceptions) centralAI.pendingInterceptions = [];
  pendingRef.current = centralAI.pendingInterceptions;

  useEffect(() => {
    if (!enabled) return;
    if (!allUnits || allUnits.length === 0) return;

    intervalRef.current = setInterval(() => {
      // ------------------------------
      // 1️⃣ Radar detection
      // ------------------------------
      allUnits.filter(u => u.type === "radar").forEach(radar => {
        missiles.forEach(missile => {
          if (missile.exploded) return;

          const dx = missile.lng - radar.lng;
          const dy = missile.lat - radar.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radar.range) {
            // Radar detects missile → notify Central AI
            centralAI.handleDetection?.(radar.baseId, missile);
          }
        });
      });

      // ------------------------------
      // 2️⃣ Launch interceptors automatically
      // ------------------------------
      // Loop over pending interceptions
      (pendingRef.current || []).forEach(({ launcherId, threat }, idx) => {
        const launcher = allUnits.find(u => u.id === launcherId);
        if (!launcher || !threat || threat.exploded) return;

        // Compute velocity
        const dx = threat.lng - launcher.lng;
        const dy = threat.lat - launcher.lat;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const speed = 0.08;

        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        // Launch interceptor
        setActiveInterceptors(prev => [
          ...prev,
          {
            id: `intc-${Date.now()}-${Math.random()}`,
            type: "interceptor",
            lat: launcher.lat,
            lng: launcher.lng,
            targetId: threat.id,
            speed: speed * 0.625, // optional scaling
            vx,
            vy,
            exploded: false,
            reached: false,
          },
        ]);

        // Remove from pending to prevent double-launch
        centralAI.pendingInterceptions.splice(idx, 1);
      });
    }, 200);

    return () => clearInterval(intervalRef.current);
  }, [enabled, allUnits, missiles, setActiveInterceptors, centralAI]);

  // ------------------------------
  // 3️⃣ Interceptor movement & collision
  // ------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveInterceptors(prev => {
        return prev.map(intc => {
          if (intc.exploded || intc.reached) return intc;

          const target = missiles.find(m => m.id === intc.targetId && !m.exploded);
          if (!target) return { ...intc, exploded: true };

          // move interceptor
          const dx = target.lng - intc.lng;
          const dy = target.lat - intc.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const speed = intc.speed || 0.05;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;

          // check collision
          if (dist < 0.05) {
            // explosion effect
            if (mapInstance && setExplosions) {
              const point = mapInstance.latLngToContainerPoint([target.lat, target.lng]);
              setExplosions(prevExp => [...prevExp, { x: point.x, y: point.y }]);
            }
            target.exploded = true;
            return { ...intc, exploded: true, reached: true };
          }

          return {
            ...intc,
            vx,
            vy,
            lat: intc.lat + vy,
            lng: intc.lng + vx,
          };
        });
      });
    }, 30);

    return () => clearInterval(interval);
  }, [missiles, mapInstance, setExplosions, setActiveInterceptors]);
}
