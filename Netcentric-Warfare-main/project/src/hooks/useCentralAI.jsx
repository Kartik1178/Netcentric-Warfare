import { useEffect, useRef } from "react";
import socket from "../components/socket";
import { getDistance } from "../utils/GetDistance";
import { CENTRAL_AI_POSITION } from "../constants/AIconstant";

export function useCentralAI(units, onDecision, emitSignal, showMessageCallback) {
  const lastProcessedMissileTime = useRef(new Map());
  const PROCESSING_COOLDOWN_MS = 1000;

  const missileAssignments = useRef(new Map()); // missileId -> unitId
  const unitLocks = useRef(new Map());           // unitId -> missileId
  const processedMissiles = useRef(new Set());   // missileId already handled
  const unitsRef = useRef(units);
  unitsRef.current = units; // always latest units

  useEffect(() => {
    const handleUnitSignal = (signal) => {
      if (signal.type !== "relay-to-c2" || signal.source !== "antenna") return;

      const missile = signal.payload;
      const missileId = missile.missileId ?? missile.id ?? missile.objectId;
      if (!missileId) return console.error("[CentralAI] Missing missileId");

      // Cooldown check
      const now = Date.now();
      const lastTime = lastProcessedMissileTime.current.get(missileId);
      if (lastTime && now - lastTime < PROCESSING_COOLDOWN_MS) return;

      // Atomic lock: skip if already processing
      if (processedMissiles.current.has(missileId)) return;
      processedMissiles.current.add(missileId);
      lastProcessedMissileTime.current.set(missileId, now);

      if (showMessageCallback) {
        showMessageCallback(
          CENTRAL_AI_POSITION.x,
          CENTRAL_AI_POSITION.y,
          "Analyzing Threats…",
          2,
          "central-ai"
        );
      }

      let decision;
      try {
        decision = decideResponse(missile, unitsRef.current, missileId, unitLocks.current);
      } catch (err) {
        console.error(`[CentralAI] Error deciding response for missile ${missileId}`, err);
        processedMissiles.current.delete(missileId);
        return;
      }

      if (!decision || !decision.target) {
        processedMissiles.current.delete(missileId);
        return;
      }

      const { action, target } = decision;

      // Ensure unit not already assigned
      if (unitLocks.current.has(target.id)) {
        processedMissiles.current.delete(missileId);
        return;
      }

      // Lock the unit and assign missile
      unitLocks.current.set(target.id, missileId);
      missileAssignments.current.set(missileId, target.id);

      const shortMissileId = missileId.slice(-4);
      const shortUnitId = target.id.slice(-4);

      if (action === "intercept") {
        socket.emit("command-launch", { missile, launcherId: target.id });
        showMessageCallback?.(
          CENTRAL_AI_POSITION.x,
          CENTRAL_AI_POSITION.y,
          `Launching Interceptor from ${shortUnitId} for ${shortMissileId}`,
          2,
          "central-ai"
        );

        const visualSignal = {
          from: CENTRAL_AI_POSITION,
          to: { x: target.x, y: target.y },
          source: "central",
          type: "interceptor-launch",
            launcherId: target.id,   
          payload: {
            id: missileId,
            currentX: missile.x ?? missile.currentX,
            currentY: missile.y ?? missile.currentY,
            vx: missile.vx,
            vy: missile.vy,
          },
        };

        emitSignal?.(visualSignal);
        socket.emit("unit-signal", visualSignal);

      } else if (action === "jam") {
        socket.emit("command-jam", { missile, jammerId: target.id });
        emitSignal?.({ from: target.id, to: missileId, type: "jamming-activate" });
        showMessageCallback?.(
          CENTRAL_AI_POSITION.x,
          CENTRAL_AI_POSITION.y,
          `Jamming activated from ${shortUnitId} for ${shortMissileId}`,
          2,
          "central-ai"
        );

      } else if (action === "monitor") {
        showMessageCallback?.(
          CENTRAL_AI_POSITION.x,
          CENTRAL_AI_POSITION.y,
          `Monitoring ${shortMissileId} (Threat: ${decision.threatLevel})`,
          2,
          "central-ai"
        );
      }
    };

    socket.on("unit-signal", handleUnitSignal);
    return () => socket.off("unit-signal", handleUnitSignal);
  }, [onDecision, emitSignal, showMessageCallback]);
}

// ---- Helpers ----
function decideResponse(missile, units, missileId, unitLocks) {
  const threatLevel = classifyThreat(missile, units);

  // Jammers first
  if (missile.category === "jammer") {
    const jammer = getNearestUnit(missile, units, "defense-jammer", unitLocks);
    if (jammer) return { action: "jam", target: jammer, threatLevel };
  }

  // High-threat missiles
  if (threatLevel === "HIGH") {
    const launcher = getNearestUnit(missile, units, "launcher", unitLocks);
    if (launcher) return { action: "intercept", target: launcher, threatLevel };
  }

  return { action: "monitor", target: null, threatLevel };
}

function classifyThreat(missile, units) {
  const missilePos = { x: missile.currentX, y: missile.currentY };
  let minDistance = Infinity;

  for (let unit of units.filter((u) => u.type === "radar")) {
    if (unit.x != null && unit.y != null) {
      const dist = getDistance(missilePos, { x: unit.x, y: unit.y });
      if (dist < minDistance) minDistance = dist;
    }
  }

  const speed = Math.sqrt((missile.vx ?? 0) ** 2 + (missile.vy ?? 0) ** 2);
  if (minDistance < 3500 || speed > 0.03) return "HIGH";
  if (minDistance < 5000) return "MEDIUM";
  return "LOW";
}

function getNearestUnit(missile, units, type, unitLocks) {
  const filtered = units.filter((u) => u.type === type && !unitLocks.has(u.id));
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

  return closest;
}