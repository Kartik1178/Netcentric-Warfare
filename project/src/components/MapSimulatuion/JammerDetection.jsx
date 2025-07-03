import { useEffect } from "react";
import socket from "../socket";

export function useJammerDetection({
  id,
  x,
  y,
  myFrequency,
  jammerHandler,
}) {
  useEffect(() => {
    const handleJammerUpdate = (jammer) => {
      const dx = jammer.x - x;
      const dy = jammer.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const isAffected =
        distance < jammer.effectRadius &&
        jammer.frequency === myFrequency;

      jammerHandler(isAffected, jammer);
    };

    socket.on("jammer-broadcast", handleJammerUpdate);
    return () => socket.off("jammer-broadcast", handleJammerUpdate);
  }, [x, y, myFrequency, jammerHandler]);
}
