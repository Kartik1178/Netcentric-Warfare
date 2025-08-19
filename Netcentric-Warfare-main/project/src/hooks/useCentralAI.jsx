import { useEffect, useRef } from "react";
import socket from "../components/socket";
import { getDistance } from "../utils/GetDistance";
import { CENTRAL_AI_POSITION } from "../constants/AIconstant";

export function useCentralAI(units, onDecision, emitSignal, showMessageCallback) {
  const lastProcessedMissileTime = useRef(new Map());
  const PROCESSING_COOLDOWN_MS = 1000;

  useEffect(() => {
    const handleUnitSignal = (signal) => {
      if (signal.type === "relay-to-c2" && signal.source === "antenna") {
        const missile = signal.payload;
        const missileId = missile.missileId ?? missile.id;

        const now = Date.now();

        if (!missileId) {
          console.error("❌ [CentralAI] Received a relay signal with an undefined missileId. Skipping.");
          return;
        }

        const lastTime = lastProcessedMissileTime.current.get(missileId);
        if (lastTime && now - lastTime < PROCESSING_COOLDOWN_MS) {
          console.log(`[CentralAI] Skipping missile ${missileId} (within cooldown).`);
          return;
        }

        lastProcessedMissileTime.current.set(missileId, now);

        console.log(`📡 CentralAI: Received missile data from Antenna ${signal.payload.targetAntennaId}:`, missile);
        console.log("🚀 Available Launcher Units for AI:", units.filter(u => u.type === 'launcher').map(l => ({ id: l.id, x: l.x, y: l.y, lat: l.lat, lng: l.lng })));

        if (showMessageCallback) {
          showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, "Analyzing Threats…", 2, "central-ai");
        }

        let decision;
        let threatLevel = "UNKNOWN";

        try {
          decision = decideResponse(missile, units, missileId);
          threatLevel = decision?.threatLevel || "UNKNOWN";
        } catch (error) {
          console.error(`❌ [CentralAI] Error during decision making for missile ${missileId}:`, error);
          if (showMessageCallback) {
            const shortId = missileId.slice(-4);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `AI Error for ${shortId}`, 2, "red");
          }
          return;
        }

        if (!decision) {
          const shortId = missileId.slice(-4);
          console.log("[CentralAI] No decision made for missile:", missileId);
          if (showMessageCallback) {
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `No action for ${shortId}`, 2, "central-ai");
          }
          return;
        }

        const { action, target } = decision;

        const shortMissileId = missileId.slice(-4);
        if (action === "intercept") {
          socket.emit("command-launch", { missile, launcherId: target.id });
          if (showMessageCallback) {
            const shortLauncherId = target.id.slice(-4);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Launching Interceptor from ${shortLauncherId} for ${shortMissileId}`, 2, "central-ai");
          }

          const visualSignal = {
            from: CENTRAL_AI_POSITION,
            to: { x: target.x, y: target.y },
            source: "central",
            type: "interceptor-launch",
            payload: {
              id: missileId,
              currentX: missile.x ?? missile.currentX,
              currentY: missile.y ?? missile.currentY,
              vx: missile.vx,
              vy: missile.vy
            }
          };

          emitSignal?.(visualSignal);
          socket.emit("unit-signal", visualSignal);

        } else if (action === "jam") {
          socket.emit("command-jam", { missile, jammerId: target.id });
          emitSignal?.({ from: target.id, to: missileId, type: "jamming-activate" });
          if (showMessageCallback) {
            const shortJammerId = target.id.slice(-4);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Jamming activated from ${shortJammerId} for ${shortMissileId}`, 2, "central-ai");
          }

        } else if (action === "monitor") {
          if (showMessageCallback) {
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Monitoring ${shortMissileId} (Threat: ${threatLevel})`, 2, "central-ai");
          }
        }
      }
    };

    socket.on("unit-signal", handleUnitSignal);
    return () => socket.off("unit-signal", handleUnitSignal);
  }, [units, onDecision, emitSignal, showMessageCallback]);
}

// ---- Helper functions ----

function decideResponse(missile, units, missileId) {
  const threatLevel = classifyThreat(missile, units);
  const shortId = missileId.slice(-4);
  console.log(`[CentralAI] Deciding response for missile ${shortId}. Threat Level: ${threatLevel}`);

  if (missile.category === "jammer") {
    const jammer = getNearestUnit(missile, units, "defense-jammer");
    if (jammer) return { action: "jam", target: jammer, threatLevel };
  }

  if (threatLevel === "HIGH") {
    const launcher = getNearestUnit(missile, units, "launcher");
    console.log(`[CentralAI] Threat HIGH. Nearest launcher: ${launcher ? launcher.id : 'None'}`);
    if (launcher) return { action: "intercept", target: launcher, threatLevel };
  }

  return { action: "monitor", target: null, threatLevel };
}

function classifyThreat(missile, units) {
  const missilePos = { x: missile.currentX, y: missile.currentY };
  let minDistance = Infinity;

  for (let unit of units.filter(u => u.type === 'radar')) {
    if (unit.x != null && unit.y != null) {
      const dist = getDistance(missilePos, { x: unit.x, y: unit.y });
      if (dist < minDistance) minDistance = dist;
    }
  }

  const speed = Math.sqrt((missile.vx ?? 0) ** 2 + (missile.vy ?? 0) ** 2);
  console.log(`[CentralAI] Threat Classification → Distance: ${minDistance.toFixed(2)}km, Speed: ${speed.toFixed(2)}`);

  if (minDistance < 3500 || speed > 0.03) return "HIGH";
  if (minDistance < 5000) return "MEDIUM";
  return "LOW";
}

function getNearestUnit(missile, units, type) {
  const filtered = units.filter(u => u.type === type);
  let closest = null;
  let minDist = Infinity;

  console.log(`[getNearestUnit] Searching nearest ${type} to missile at X:${missile.currentX?.toFixed(2)}, Y:${missile.currentY?.toFixed(2)}`);
  console.log(`[getNearestUnit] Found ${filtered.length} units of type ${type}`);

  for (let unit of filtered) {
    let d;
    if (missile.currentLat != null && missile.currentLng != null && unit.lat != null && unit.lng != null) {
      d = getDistance({ lat: missile.currentLat, lng: missile.currentLng }, { lat: unit.lat, lng: unit.lng });
    } else if (unit.x != null && unit.y != null) {
      d = getDistance({ x: missile.currentX, y: missile.currentY }, { x: unit.x, y: unit.y });
    } else {
      d = Infinity;
    }

    console.log(`[getNearestUnit] Unit ${unit.id} distance: ${d.toFixed(2)}`);
    if (d < minDist) {
      minDist = d;
      closest = unit;
    }
  }

  return closest;
}
