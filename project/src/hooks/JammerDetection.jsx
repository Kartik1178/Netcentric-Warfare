import { useEffect, useRef } from "react";
import socket from "../components/socket";

export function useJammerDetection({
  id,
  x,
  y,
  myFrequency,
  jammerHandler,
  setJammerReports,
}) {
  const lastHandledRef = useRef(0); // ⏱️ throttle per unit

  useEffect(() => {
    const handleJammerUpdate = (jammer) => {
      const now = Date.now();
      const timeSinceLast = now - lastHandledRef.current;

      // ⏳ Throttle: only run every 500ms per unit
      if (timeSinceLast < 500) return;

      lastHandledRef.current = now;

      const dx = jammer.x - x;
      const dy = jammer.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const isInRadius = distance < jammer.effectRadius;
      const isFrequencyAffected = jammer.frequency === myFrequency;
      const isAffected = isInRadius && isFrequencyAffected;

      if (jammerHandler) {
        jammerHandler(isAffected, jammer);
      }

      if (setJammerReports && myFrequency) {
        setJammerReports((prev) => ({
          ...prev,
          [jammer.frequency]: Math.max(
            isAffected ? 1 : 0,
            prev[jammer.frequency] || 0
          ),
        }));
      }

      console.log(
        `[${id}] Jammer ${jammer.id} freq ${jammer.frequency} affected=${isAffected}`
      );
    };

    socket.on("jammer-broadcast", handleJammerUpdate);
    return () => socket.off("jammer-broadcast", handleJammerUpdate);
  }, [id, x, y, myFrequency, jammerHandler, setJammerReports]);
}
