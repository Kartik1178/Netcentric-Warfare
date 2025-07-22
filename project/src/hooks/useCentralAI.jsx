import { useEffect } from "react";
import socket from "../components/socket";
import { getDistance } from "../utils/GetDistance";
import { CENTRAL_AI_POSITION } from "../constants/AIconstant";
export function useCentralAI(units, onDecision, emitSignal,showMessage) {
  useEffect(() => {
    const handleRelay = (missile) => {
              showMessage(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, "Analyzing Threats…",2,"central-ai");
      const decision = decideResponse(missile, units);
      if (!decision) return;

      const { action, target } = decision;

      const log = {
        time: new Date().toLocaleTimeString(),
        missileId: missile.id,
        action,
        targetUnit: target?.id || "-",
      };
      onDecision(log);

      // 🔁 EMIT SIGNAL HERE
      if (action === "intercept") {
        socket.emit("command-launch", { missile, launcherId: target.id });
                showMessage(CENTRAL_AI_POSITION.x, CENTRAL_AI_POSITION.y, `Launching Interceptor from ${target.id}`,2,"central-ai");
        console.log("📡 CentralAI: Emitting signal to launcher:", {
  to: target.id,
  missileId: missile.id,
})
 const signal = {
    from:CENTRAL_AI_POSITION,
    to: { x: target.x, y: target.y },
    source: "central", // Needed to color it white
    type: "interceptor-launch",
    payload: {
      id: missile.id,
      currentX: missile.x ?? missile.currentX,
      currentY: missile.y ?? missile.currentY,
      vx: missile.vx,
      vy: missile.vy
    }};
        emitSignal?.({
          from: "central-ai",
  to: target.id,
          type: "interceptor-launch",
           payload: {
    id: missile.id,
        currentX: missile.x ?? missile.currentX,
    currentY: missile.y ?? missile.currentY,

    vx: missile.vx,
    vy: missile.vy
  }
        });
       setTimeout(() => {
    emitSignal?.(signal);             // Trigger visual feedback after delay
    socket.emit("unit-signal", signal); // Emit socket signal after delay
  }, 1000);
      } else if (action === "jam") {
        socket.emit("command-jam", { missile, jammerId: target.id });
        emitSignal?.({
          from: target.id,
          to: missile.id,
          type: "jamming-activate",
        });
           showMessage(target.x, target.y, `Jamming activated from ${target.id}`);
      }
    };

    socket.on("relay-to-c2", handleRelay);
    return () => socket.off("relay-to-c2", handleRelay);
  }, [units, onDecision, emitSignal, showMessage]);
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
  const bases = units.filter((u) => u.type === "radar").map((r) => ({ x: r.x, y: r.y }));
const distance = Math.min(
  ...bases.map((b) => getDistance({ x: missile.x ?? missile.currentX, y: missile.y ?? missile.currentY }, b))
);

  const speed = Math.sqrt(missile.vx ** 2 + missile.vy ** 2);
  console.log(`[CentralAI] Threat Classification → Distance: ${distance}, Speed: ${speed.toFixed(2)}`);
  if (distance < 250 || speed > 1.5) return "HIGH";
  if (distance < 400) return "MEDIUM";
  return "LOW";
}

function getNearestUnit(missile, units, type) {
  const filtered = units.filter((u) => u.type === type);
  let closest = null;
  let minDist = Infinity;

  for (let unit of filtered) {
    const missilePos = {
  x: missile.x ?? missile.currentX,
  y: missile.y ?? missile.currentY,
};

const d = getDistance(missilePos, unit);

  
    if (d < minDist) {
      minDist = d;
      closest = unit;
    }
  }
  return closest;
}
