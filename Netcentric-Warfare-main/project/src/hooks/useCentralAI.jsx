import { useEffect, useRef } from "react";
import socket from "../components/socket";
import { getDistance } from "../utils/GetDistance";
import { CENTRAL_AI_POSITION } from "../constants/AIconstant";

export function useCentralAI(units, onDecision, emitSignal, showMessageCallback) {
  // Ref to store the last time a missile was processed by Central AI
  const lastProcessedMissileTime = useRef(new Map());
  const PROCESSING_COOLDOWN_MS = 1000; // Only process a missile every 1000ms (1 second)

  useEffect(() => {
    const handleUnitSignal = (signal) => {
      // Filter for signals from 'antenna' with type 'relay-to-c2'
      if (signal.type === "relay-to-c2" && signal.source === "antenna") {
        const missile = signal.payload; // The antenna payload is the missile data
        const missileId = missile.missileId; // Get missile ID for deduplication
        const now = Date.now();

        // Deduplication Check: Skip if this missile was processed recently
        const lastTime = lastProcessedMissileTime.current.get(missileId);
        if (lastTime && (now - lastTime < PROCESSING_COOLDOWN_MS)) {
          console.log(`[CentralAI] Skipping processing for missile ${missileId} (within cooldown).`);
          return;
        }

        console.log(`📡 CentralAI: Received missile data from Antenna ${signal.payload.targetAntennaId}:`, missile);
        lastProcessedMissileTime.current.set(missileId, now); // Update last processed time

        // Use the callback directly for floating messages
        if (showMessageCallback) {
          console.log(`[CentralAI] Calling showMessage: "Analyzing Threats…"`);
          showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, "Analyzing Threats…", 2, "central-ai");
        }

        const decision = decideResponse(missile, units);
        if (!decision) {
          console.log("[CentralAI] No decision made for missile:", missile.id);
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "No action for ${missile.id.substring(missile.id.length - 4)}"`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `No action for ${missile.id.substring(missile.id.length - 4)}`, 2, "central-ai");
          }
          return;
        }

        const { action, target } = decision;

        // ❌ REMOVED: onDecision(log); // This line is removed to stop logging AI decisions to simulation log

        if (action === "intercept") {
          socket.emit("command-launch", { missile, launcherId: target.id });
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "Launching Interceptor..."`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Launching Interceptor from ${target.id.substring(target.id.length - 4)} for ${missile.id.substring(missile.id.length - 4)}`, 2, "central-ai");
          }
          console.log("📡 CentralAI: Emitting signal to launcher:", {
            to: target.id,
            missileId: missile.id,
          });

          const visualSignal = {
            from: CENTRAL_AI_POSITION,
            to: { x: target.x, y: target.y },
            source: "central", // Needed to color it white
            type: "interceptor-launch",
            payload: {
              id: missile.id,
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
          emitSignal?.({
            from: target.id,
            to: missile.id,
            type: "jamming-activate",
          });
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "Jamming activated..."`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Jamming activated from ${target.id.substring(target.id.length - 4)} for ${missile.id.substring(missile.id.length - 4)}`, 2, "central-ai");
          }
        } else if (action === "monitor") {
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "Monitoring..."`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Monitoring ${missile.id.substring(missile.id.length - 4)} (Threat: ${threatLevel})`, 2, "central-ai");
          }
        }
      }
    };

    socket.on("unit-signal", handleUnitSignal);
    return () => socket.off("unit-signal", handleUnitSignal);
  }, [units, onDecision, emitSignal, showMessageCallback]);
}

// 💡 Make this PURE — no side effects like emitSignal here
function decideResponse(missile, units) {
  const threatLevel = classifyThreat(missile, units);

  if (missile.category === "jammer") {
    const jammer = getNearestUnit(missile, units, "defense-jammer");
    if (jammer) return { action: "jam", target: jammer };
  }

  if (threatLevel === "HIGH") {
    const launcher = getNearestUnit(missile, units, "launcher");
    if (launcher) return { action: "intercept", target: launcher };
  }

  return { action: "monitor", target: null };
}

function classifyThreat(missile, units) {
  // Use currentLat/currentLng from missile payload for distance calculation
  const missilePos = {
    lat: missile.currentLat,
    lng: missile.lng
  };

  // Find the closest radar unit's geographical coordinates for distance check
  let minDistance = Infinity;
  for (let unit of units.filter(u => u.type === 'radar')) {
    if (unit.lat && unit.lng) {
      const dist = getDistance({lat: missilePos.lat, lng: missilePos.lng}, {lat: unit.lat, lng: unit.lng});
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }

  const speed = Math.sqrt(missile.velocityX ** 2 + missile.velocityY ** 2);
  console.log(`[CentralAI] Threat Classification → Distance: ${minDistance.toFixed(2)}km, Speed: ${speed.toFixed(2)} (from antenna data)`);
  
  // Adjusted thresholds for threat classification based on distance in KM
  if (minDistance < 100 || speed > 0.1) return "HIGH"; // Adjust speed threshold if 0.1 is too high/low
  if (minDistance < 300) return "MEDIUM";
  return "LOW";
}

function getNearestUnit(missile, units, type) {
  const filtered = units.filter((u) => u.type === type);
  let closest = null;
  let minDist = Infinity;

  for (let unit of filtered) {
    let d;
    // Prioritize geographical coordinates for distance calculation if available
    if (missile.currentLat != null && missile.currentLng != null && unit.lat != null && unit.lng != null) {
      d = getDistance({ lat: missile.currentLat, lng: missile.currentLng }, { lat: unit.lat, lng: unit.lng });
    } else {
      // Fallback to pixel coordinates if geographical are not available
      d = getDistance({ x: missile.currentX, y: missile.currentY }, unit);
    }
  
    if (d < minDist) {
      minDist = d;
      closest = unit;
    }
  }
  return closest;
}