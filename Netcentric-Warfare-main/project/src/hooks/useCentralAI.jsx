import { useEffect, useRef } from "react";
import socket from "../components/socket";
import { getDistance } from "../utils/GetDistance"; // Assuming getDistance is correctly defined to handle {x,y} and {lat,lng}
import { CENTRAL_AI_POSITION } from "../constants/AIconstant";

export function useCentralAI(units, onDecision, emitSignal, showMessageCallback) {
  const lastProcessedMissileTime = useRef(new Map());
  const PROCESSING_COOLDOWN_MS = 1000; // Cooldown to prevent excessive processing of the same missile

  useEffect(() => {
    const handleUnitSignal = (signal) => {
      if (signal.type === "relay-to-c2" && signal.source === "antenna") {
        const missile = signal.payload;
        const missileId = missile.id;
        const now = Date.now();

        // Guard against missing missile ID
        if (!missileId) {
          console.error("❌ [CentralAI] Received a relay signal with an undefined missileId. Skipping.");
          return;
        }

        // Implement cooldown to avoid processing the same missile too often
        const lastTime = lastProcessedMissileTime.current.get(missileId);
        if (lastTime && (now - lastTime < PROCESSING_COOLDOWN_MS)) {
          console.log(`[CentralAI] Skipping processing for missile ${(missileId || 'undefined')} (within cooldown).`);
          return;
        }
        
        console.log(`📡 CentralAI: Received missile data from Antenna ${signal.payload.targetAntennaId}:`, missile);
        lastProcessedMissileTime.current.set(missileId, now); // Update last processed time

        // Log the available launcher units to debug if 'Nearest launcher found: None' occurs
        console.log("🚀 Available Launcher Units for AI:", units.filter(u => u.type === 'launcher').map(l => ({ id: l.id, x: l.x, y: l.y, lat: l.lat, lng: l.lng })));


        // Display a message indicating analysis is in progress
        if (showMessageCallback) {
          console.log(`[CentralAI] Calling showMessage: "Analyzing Threats…"`);
          showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, "Analyzing Threats…", 2, "central-ai");
        }

        let decision;
        let threatLevel = "UNKNOWN";

        try {
          // Determine the AI's response based on the missile threat
          decision = decideResponse(missile, units);
          threatLevel = decision?.threatLevel || "UNKNOWN";
        } catch (error) {
          console.error(`❌ [CentralAI] Error during decision making for missile ${missileId}:`, error);
          if (showMessageCallback) {
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `AI Error for ${missileId.substring(missileId.length - 4)}`, 2, "red");
          }
          return;
        }

        // If no decision is made, log and show a message
        if (!decision) {
          console.log("[CentralAI] No decision made for missile:", missileId);
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "No action for ${missileId.substring(missileId.length - 4)}"`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `No action for ${missileId.substring(missileId.length - 4)}`, 2, "central-ai");
          }
          return;
        }

        const { action, target } = decision;

        // Execute the decided action
        if (action === "intercept") {
          socket.emit("command-launch", { missile, launcherId: target.id });
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "Launching Interceptor..."`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Launching Interceptor from ${target.id.substring(target.id.length - 4)} for ${missileId.substring(missileId.length - 4)}`, 2, "central-ai");
          }
          console.log("📡 CentralAI: Emitting signal to launcher:", {
            to: target.id,
            missileId: missileId,
          });

          // Prepare visual signal for interceptor launch
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
          
          emitSignal?.(visualSignal); // Emit signal for visual representation
          socket.emit("unit-signal", visualSignal); // Also send via socket for other listeners
        } else if (action === "jam") {
          socket.emit("command-jam", { missile, jammerId: target.id });
          emitSignal?.({
            from: target.id,
            to: missileId,
            type: "jamming-activate",
          });
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "Jamming activated..."`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Jamming activated from ${target.id.substring(target.id.length - 4)} for ${missileId.substring(missileId.length - 4)}`, 2, "central-ai");
          }
        } else if (action === "monitor") {
          if (showMessageCallback) {
            console.log(`[CentralAI] Calling showMessage: "Monitoring..."`);
            showMessageCallback(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Monitoring ${missileId.substring(missileId.length - 4)} (Threat: ${threatLevel})`, 2, "central-ai");
          }
        }
      }
    };

    // Set up socket listener for unit signals
    socket.on("unit-signal", handleUnitSignal);
    // Clean up listener on component unmount
    return () => socket.off("unit-signal", handleUnitSignal);
  }, [units, onDecision, emitSignal, showMessageCallback]); // Dependencies for useEffect

} // End of useCentralAI hook


// Determines the AI's response (intercept, jam, or monitor) based on threat level
function decideResponse(missile, units) {
  const threatLevel = classifyThreat(missile, units);
  console.log(`[CentralAI] Deciding response for missile ${missile.id.substring(missile.id.length - 4)}. Threat Level: ${threatLevel}`); // Added log

  // If the missile is a "jammer" category (though not typically missile type), find nearest defense jammer
  if (missile.category === "jammer") {
    const jammer = getNearestUnit(missile, units, "defense-jammer");
    if (jammer) return { action: "jam", target: jammer, threatLevel };
  }

  // If threat is HIGH, find nearest launcher and intercept
  if (threatLevel === "HIGH") {
    const launcher = getNearestUnit(missile, units, "launcher");
    console.log(`[CentralAI] Threat HIGH. Nearest launcher found: ${launcher ? launcher.id : 'None'}`); // Added log
    if (launcher) return { action: "intercept", target: launcher, threatLevel };
  }

  // Default action is to monitor if no other action is taken
  return { action: "monitor", target: null, threatLevel };
}

// Classifies the threat level (HIGH, MEDIUM, LOW) based on distance and speed
function classifyThreat(missile, units) {
  // Use the x and y coordinates from the missile data, as these are provided by the antenna
  const missilePos = {
    x: missile.currentX,
    y: missile.currentY
  };

  let minDistance = Infinity;
  // Find the closest radar unit to the missile
  for (let unit of units.filter(u => u.type === 'radar')) {
    // Ensure the unit has valid x and y coordinates for distance calculation
    if (unit.x != null && unit.y != null) {
      // Pass explicit { x, y } for the unit's position as well
      const dist = getDistance(missilePos, { x: unit.x, y: unit.y }); 
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }

  // Calculate the missile's speed using its velocity components
  const speed = Math.sqrt((missile.vx ?? 0) ** 2 + (missile.vy ?? 0) ** 2);
  console.log(`[CentralAI] Threat Classification → Distance: ${minDistance.toFixed(2)}km, Speed: ${speed.toFixed(2)} (from antenna data)`);
  
  // Threat classification logic based on distance and speed
  // Adjusted thresholds to make missiles at ~4000km be classified as HIGH or MEDIUM
  if (minDistance < 3500 || speed > 0.03) return "HIGH"; // Missile within 3500km or faster than 0.03 is HIGH
  if (minDistance < 5000) return "MEDIUM"; // Missile within 5000km is MEDIUM
  return "LOW"; // Otherwise, it's a LOW threat
}

// Finds the nearest unit of a specific type to the missile
function getNearestUnit(missile, units, type) {
  const filtered = units.filter((u) => u.type === type);
  let closest = null;
  let minDist = Infinity;

  console.log(`[getNearestUnit] Searching for nearest ${type} to missile at X: ${missile.currentX?.toFixed(2)}, Y: ${missile.currentY?.toFixed(2)}`);
  console.log(`[getNearestUnit] Filtering for type: ${type}. Found ${filtered.length} units.`);


  for (let unit of filtered) {
    let d;
    // Prioritize lat/lng for distance calculation if available for both missile and unit
    if (missile.currentLat != null && missile.currentLng != null && unit.lat != null && unit.lng != null) {
      d = getDistance({ lat: missile.currentLat, lng: missile.currentLng }, { lat: unit.lat, lng: unit.lng });
    } else {
      // OTHERWISE, use x/y coordinates and EXPLICITLY pass unit.x and unit.y
      if (unit.x != null && unit.y != null) { // Added check for unit's own coordinates
        d = getDistance({ x: missile.currentX, y: missile.currentY }, { x: unit.x, y: unit.y });
      } else {
        // Fallback if unit also doesn't have valid x/y (shouldn't happen with correct unit generation)
        d = Infinity; 
      }
    }
    
    // Log the distance for each unit being considered
    console.log(`[getNearestUnit] Unit ${unit.id} (X: ${unit.x?.toFixed(2)}, Y: ${unit.y?.toFixed(2)}) distance: ${d.toFixed(2)}`);

    if (d < minDist) {
      minDist = d;
      closest = unit;
    }
  }
  return closest;
}
