import { useEffect, useRef } from "react";
import socket from "../components/socket";
import { getDistance } from "../utils/GetDistance";
import { CENTRAL_AI_POSITION } from "../constants/AIconstant";

const baseRelayedMissilesMap = new Map();

export default function useDefenseSystemManager({
  objects,
  zoom,
  onLogsUpdate,
  emitSignal,
  showMessage,
  baseId,
  active,
  spawnInterceptor,
}) {
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  const baseReadyLogged = useRef(false); // ✅ Log only once per base

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const currentObjects = objectsRef.current;
      const base = currentObjects.find(u => u.type === "base" && u.id === baseId);

      // Check for base position in either pixel coordinates or lat/lng coordinates
      if (!base || (base.x == null && base.lat == null)) {
        // Don't spam logs
        if (!baseReadyLogged.current) {
          console.debug(`[DefenseSystemManager] Waiting for base ${baseId} position...`);
        }
        return;
      }

      // Log once
      if (!baseReadyLogged.current) {
        const position = base.x != null ? `x=${base.x}, y=${base.y}` : `lat=${base.lat}, lng=${base.lng}`;
        console.log(`[DefenseSystemManager] Base ${baseId} ready at ${position}`);
        baseReadyLogged.current = true;
      }

      // ---- DETECT NEARBY THREATS ----
      const threats = currentObjects.filter(
        o => ["missile", "drone", "artillery"].includes(o.type) && !o.exploded
      );

      if (threats.length > 0) {
        console.log(`[DefenseSystemManager] Base ${baseId} checking ${threats.length} threats at zoom ${zoom}`);
      }

      threats.forEach(obj => {
        let distance;
        
        // Calculate distance based on available coordinates
        // Try pixel coordinates first (for high zoom levels)
        if (base.x != null && base.y != null && (obj.currentX != null || obj.x != null) && (obj.currentY != null || obj.y != null)) {
          // Use pixel coordinates if available
          distance = getDistance({ x: base.x, y: base.y }, { x: obj.currentX ?? obj.x, y: obj.currentY ?? obj.y });
        } 
        // Try lat/lng coordinates (for low zoom levels or when pixel coordinates aren't available)
        else if (base.lat != null && base.lng != null && (obj.currentLat != null || obj.lat != null) && (obj.currentLng != null || obj.lng != null)) {
          // Use lat/lng coordinates for distance calculation
          const objLat = obj.currentLat ?? obj.lat;
          const objLng = obj.currentLng ?? obj.lng;
          const R = 6371; // Earth's radius in km
          const dLat = (objLat - base.lat) * Math.PI / 180;
          const dLng = (objLng - base.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(base.lat * Math.PI / 180) * Math.cos(objLat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = R * c * 1000; // Convert to meters
        } else {
          // Skip if we don't have enough coordinate information
          return;
        }
        
        if (distance > 5000) {
          return;
        }
        
        console.log(`[DefenseSystemManager] Threat ${obj.id} detected at ${Math.round(distance)}m from base ${baseId}`);

        const signalData = {
          from: base.id,
          to: `${baseId}-antenna`,
          source: "base",
          type: "relay-to-antenna",
          payload: {
            baseId,
            objectId: obj.id,
            type: obj.type,
            lat: obj.lat ?? obj.currentLat ?? 0,
            lng: obj.lng ?? obj.currentLng ?? 0,
            vx: obj.vx ?? 0,
            vy: obj.vy ?? 0,
          },
        };

        emitSignal?.(signalData);
        socket.emit("unit-signal", signalData);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [active, baseId, emitSignal]);




  // ---- ANTENNA → CENTRAL AI RELAY ----
  useEffect(() => {
    const handleRadarSignal = (data) => {
      if (data.type !== "relay-to-antenna" || data.payload?.baseId !== baseId) return;

      const baseRelayedSet = baseRelayedMissilesMap.get(baseId) ?? new Set();
      baseRelayedMissilesMap.set(baseId, baseRelayedSet);

      const objectId = data.payload.objectId;
      if (!objectId || baseRelayedSet.has(objectId)) return;
      baseRelayedSet.add(objectId);

      console.log(`[Antenna] 📡 Base ${baseId} relaying object ${objectId} to CentralAI`);

      setTimeout(() => {
        const signalData = {
          from: data.to,
          to: CENTRAL_AI_POSITION,
          source: "antenna",
          type: "relay-to-c2",
          payload: data.payload,
        };
        emitSignal?.(signalData);
        socket.emit("unit-signal", signalData);

        onLogsUpdate?.({
          timestamp: new Date().toLocaleTimeString(),
          source: `Antenna ${data.to?.id?.slice(-4)}`,
          type: "relay-to-c2",
          message: `Relayed ${data.payload.type} ${objectId.slice(-4)} to C2 AI.`,
        });
      }, 800);
    };

    socket.on("unit-signal", handleRadarSignal);
    return () => socket.off("unit-signal", handleRadarSignal);
  }, [baseId, emitSignal, onLogsUpdate]);

  // ---- CENTRAL AI THREAT DECISION ----
  const lastProcessedMissileTime = useRef(new Map());
  const PROCESSING_COOLDOWN_MS = 1000;
  const missileAssignments = useRef(new Map());
  const unitLocks = useRef(new Map());
  const processedMissiles = useRef(new Set());

  useEffect(() => {
    const handleCentralSignal = (signal) => {
      if (signal.type !== "relay-to-c2" || signal.source !== "antenna") return;

      const missile = signal.payload;
      const missileId = missile.missileId ?? missile.id ?? missile.objectId;
      if (!missileId) return;

      const now = Date.now();
      const lastTime = lastProcessedMissileTime.current.get(missileId);
      if (lastTime && now - lastTime < PROCESSING_COOLDOWN_MS) return;
      if (processedMissiles.current.has(missileId)) return;

      processedMissiles.current.add(missileId);
      lastProcessedMissileTime.current.set(missileId, now);

      console.log(`[CentralAI] 🧠 Processing threat ${missileId} from base ${baseId}`);

      showMessage?.(
        CENTRAL_AI_POSITION.x,
        CENTRAL_AI_POSITION.y,
        "Analyzing Threats…",
        2,
        "central-ai"
      );

      const decision = decideResponse(missile, objectsRef.current, missileId, unitLocks.current, baseId);

      if (!decision || !decision.target) {
        console.warn(`[CentralAI] ⚪ No actionable target found for missile ${missileId}`);
        processedMissiles.current.delete(missileId);
        return;
      }

      const { action, target } = decision;

      if (unitLocks.current.has(target.id)) {
        console.warn(`[CentralAI] ⚠️ Unit ${target.id} already busy — skipping missile ${missileId}`);
        processedMissiles.current.delete(missileId);
        return;
      }

      unitLocks.current.set(target.id, missileId);
      missileAssignments.current.set(missileId, target.id);

      if (action === "intercept") {
        console.log(`[CentralAI] 🚀 Launching interceptor from ${target.id} towards missile ${missileId} at zoom ${zoom}`);
        const interceptorData = {
          launcherId: target.id,
          threatId: missileId,
          launcherLat: target.lat,
          launcherLng: target.lng,
          targetLat: missile.currentLat ?? missile.lat,
          targetLng: missile.currentLng ?? missile.lng,
          vx: missile.vx ?? 0.05,
          vy: missile.vy ?? 0.05,
        };
        console.log(`[CentralAI] Interceptor data:`, interceptorData);
        spawnInterceptor?.(interceptorData);
      } else if (action === "jam") {
        console.log(`[CentralAI] 🛰️ Activating jammer ${target.id} for missile ${missileId}`);
        emitSignal?.({ from: target.id, to: missileId, type: "jamming-activate" });
      }
    };

    socket.on("unit-signal", handleCentralSignal);
    return () => socket.off("unit-signal", handleCentralSignal);
  }, [emitSignal, showMessage, spawnInterceptor,baseId]);

  // ---- HELPER FUNCTIONS ----
  function decideResponse(missile, units, missileId, unitLocks,baseId) {
    const threatLevel = classifyThreat(missile, units, baseId);

    if (threatLevel === "HIGH") {
      const launcher = getNearestUnit(missile, units, "launcher", unitLocks);
      if (launcher) return { action: "intercept", target: launcher, threatLevel };
    }

    if (missile.category === "jammer") {
      const jammer = getNearestUnit(missile, units, "defense-jammer", unitLocks);
      if (jammer) return { action: "jam", target: jammer, threatLevel };
    }

    return { action: "monitor", target: null, threatLevel };
  }

  function classifyThreat(missile, units, baseId) {
  const base = units.find(u => u.type === "base" && u.id === baseId);
  if (!base) {
    console.warn(`[CentralAI] ⚠️ Base ${baseId} not found for threat classification`);
    return "LOW";
  }

  let distance;
  let missilePos, basePos;

  // Try pixel coordinates first
  if (base.x != null && base.y != null && (missile.currentX != null || missile.x != null) && (missile.currentY != null || missile.y != null)) {
    missilePos = { x: missile.currentX ?? missile.x, y: missile.currentY ?? missile.y };
    basePos = { x: base.x ?? 0, y: base.y ?? 0 };
    distance = getDistance(basePos, missilePos);
  }
  // Fall back to lat/lng coordinates
  else if (base.lat != null && base.lng != null && (missile.currentLat != null || missile.lat != null) && (missile.currentLng != null || missile.lng != null)) {
    // Use haversine formula for lat/lng distance calculation
    const missileLat = missile.currentLat ?? missile.lat;
    const missileLng = missile.currentLng ?? missile.lng;
    const R = 6371; // Earth's radius in km
    const dLat = (missileLat - base.lat) * Math.PI / 180;
    const dLng = (missileLng - base.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(base.lat * Math.PI / 180) * Math.cos(missileLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distance = R * c * 1000; // Convert to meters
    
    missilePos = { lat: missileLat, lng: missileLng };
    basePos = { lat: base.lat, lng: base.lng };
  } else {
    console.warn(`[CentralAI] ⚠️ Insufficient coordinate data for threat classification`);
    return "LOW";
  }

  const speed = Math.sqrt((missile.vx ?? 0) ** 2 + (missile.vy ?? 0) ** 2);

  // --- LOGGING ---
  console.log(`[CentralAI] 📏 Threat classification for missile ${missile.id ?? missile.objectId}`);
  if (basePos.x != null) {
    console.log(`   Base: ${baseId} at (${basePos.x}, ${basePos.y})`);
    console.log(`   Missile: (${missilePos.x}, ${missilePos.y}), speed: ${speed.toFixed(3)}`);
  } else {
    console.log(`   Base: ${baseId} at (${basePos.lat}, ${basePos.lng})`);
    console.log(`   Missile: (${missilePos.lat}, ${missilePos.lng}), speed: ${speed.toFixed(3)}`);
  }
  console.log(`   Distance from base: ${Math.round(distance)} meters`);

  if (distance < 3500 || speed > 0.03) {
    console.log(`   => HIGH threat`);
    return "HIGH";
  }
  if (distance < 5000) {
    console.log(`   => MEDIUM threat`);
    return "MEDIUM";
  }

  console.log(`   => LOW threat`);
  return "LOW";
}


  function getNearestUnit(missile, units, type, unitLocks) {
    const filtered = units.filter(u => u.type === type && !unitLocks.has(u.id));
    let closest = null;
    let minDist = Infinity;

    for (let unit of filtered) {
      let d;
      if (missile.currentLat != null && missile.currentLng != null && unit.lat != null && unit.lng != null) {
        d = getDistance({ lat: missile.currentLat, lng: missile.currentLng }, { lat: unit.lat, lng: unit.lng });
      } else if (unit.x != null && unit.y != null) {
        d = getDistance({ x: missile.currentX, y: missile.currentY }, { x: unit.x, y: unit.y });
      } else {
        d = Infinity;
      }

      if (d < minDist) {
        minDist = d;
        closest = unit;
      }
    }

    if (closest) console.log(`[CentralAI] 🎯 Nearest ${type} selected: ${closest.id} (${Math.round(minDist)}m)`);
    else console.warn(`[CentralAI] ⚠️ No available ${type} units found`);

    return closest;
  }
}
