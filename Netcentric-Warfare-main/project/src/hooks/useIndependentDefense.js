import { useEffect, useRef } from 'react';
import { BASES } from '../constants/baseData';

/**
 * Independent defense system that works regardless of visual rendering
 * Only activates when zoomed out (base units not visible)
 * Directly monitors missiles and launches interceptors without relying on base unit visibility
 */
export function useIndependentDefense(missiles, setActiveInterceptors, zoomLevel) {
  const processedMissiles = useRef(new Set());
  const activeLaunchers = useRef(new Map()); // Track which launchers are busy
  const missilesRef = useRef(missiles);
  const setActiveInterceptorsRef = useRef(setActiveInterceptors);

  // Keep refs updated
  useEffect(() => {
    missilesRef.current = missiles;
    setActiveInterceptorsRef.current = setActiveInterceptors;
  }, [missiles, setActiveInterceptors]);

  // Check if we should use independent defense (when zoomed out)
  const shouldUseIndependentDefense = zoomLevel < 8; // Same threshold as visual rendering

  useEffect(() => {
    console.log(`[IndependentDefense] Hook activated with ${missiles?.length || 0} missiles, zoom: ${zoomLevel}, shouldUse: ${shouldUseIndependentDefense}`);
    
    // Only run when zoomed out (base units not visible)
    if (!shouldUseIndependentDefense) {
      console.log(`[IndependentDefense] Skipping - base units are visible (zoom >= 8), using normal defense chain`);
      return;
    }
    
    const interval = setInterval(() => {
      const currentMissiles = missilesRef.current;
      if (!currentMissiles || currentMissiles.length === 0) {
        console.log(`[IndependentDefense] No missiles to process in interval`);
        return;
      }
      // Find missiles that need interception
      const activeMissiles = currentMissiles.filter(missile => 
        missile && 
        !missile.exploded && 
        !missile.reached && 
        !processedMissiles.current.has(missile.id)
      );

      // Check if any interceptors are already targeting these missiles
      // (to avoid conflicts with normal defense system when zoomed in)
      const missilesWithExistingInterceptors = new Set();
      // Note: We can't easily check existing interceptors here, but we rely on the zoom level check above

      if (activeMissiles.length === 0) {
        console.log(`[IndependentDefense] No active missiles to intercept`);
        return;
      }

      console.log(`[IndependentDefense] Processing ${activeMissiles.length} active missiles`);

      activeMissiles.forEach(missile => {
        // Find the nearest base to the missile
        let nearestBase = null;
        let minDistance = Infinity;

        BASES.forEach(base => {
          const distance = calculateDistance(
            missile.lat || missile.currentLat,
            missile.lng || missile.currentLng,
            base.coords[0],
            base.coords[1]
          );
          
          if (distance < minDistance && distance < 500000) { // Within 500km - much larger range
            minDistance = distance;
            nearestBase = base;
          }
        });

        console.log(`[IndependentDefense] Missile ${missile.id}: nearest base ${nearestBase?.id} at ${Math.round(minDistance)}m`);

        if (!nearestBase) {
          console.log(`[IndependentDefense] No base found for missile ${missile.id} - using fallback`);
          // Fallback: use the first base if no nearest base found
          nearestBase = BASES[0];
          minDistance = calculateDistance(
            missile.lat || missile.currentLat,
            missile.lng || missile.currentLng,
            nearestBase.coords[0],
            nearestBase.coords[1]
          );
        }

        // Check if this base already has an active launcher
        if (activeLaunchers.current.has(nearestBase.id)) {
          console.log(`[IndependentDefense] Base ${nearestBase.id} already has active launcher`);
          return;
        }

        // Launch interceptor
        const interceptorId = `interceptor-${Date.now()}-${Math.random()}`;
        const launcherLat = nearestBase.coords[0];
        const launcherLng = nearestBase.coords[1];
        const targetLat = missile.lat || missile.currentLat;
        const targetLng = missile.lng || missile.currentLng;

        // Calculate velocity towards target
        const { vx, vy } = calculateVelocity(launcherLat, launcherLng, targetLat, targetLng, 0.08);

        const interceptor = {
          id: interceptorId,
          type: "interceptor",
          lat: launcherLat,
          lng: launcherLng,
          targetId: missile.id,
          speed: 0.05,
          vx,
          vy,
          exploded: false,
          reached: false,
          launcherBaseId: nearestBase.id
        };

        console.log(`[IndependentDefense] 🚀 Launching interceptor ${interceptorId} from base ${nearestBase.id} towards missile ${missile.id}`);
        console.log(`[IndependentDefense] Distance: ${Math.round(minDistance)}m, Base: ${nearestBase.name}`);
        console.log(`[IndependentDefense] Missile coords: lat=${missile.lat || missile.currentLat}, lng=${missile.lng || missile.currentLng}`);
        console.log(`[IndependentDefense] Base coords: lat=${nearestBase.coords[0]}, lng=${nearestBase.coords[1]}`);

        // Add interceptor
        setActiveInterceptorsRef.current(prev => [...prev, interceptor]);

        // Mark launcher as busy and missile as processed
        activeLaunchers.current.set(nearestBase.id, missile.id);
        processedMissiles.current.add(missile.id);

        // Release launcher after 5 seconds (much faster)
        setTimeout(() => {
          activeLaunchers.current.delete(nearestBase.id);
        }, 5000);
      });

    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [shouldUseIndependentDefense, zoomLevel]); // Depend on zoom level changes

  // Clean up processed missiles when they explode or reach target
  useEffect(() => {
    const currentMissiles = missilesRef.current;
    if (currentMissiles) {
      currentMissiles.forEach(missile => {
        if (missile.exploded || missile.reached) {
          processedMissiles.current.delete(missile.id);
        }
      });
    }
  }, [missiles]);
}

/**
 * Calculate distance between two lat/lng points in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Calculate velocity vector between two points
 */
function calculateVelocity(startLat, startLng, endLat, endLng, speed) {
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}
