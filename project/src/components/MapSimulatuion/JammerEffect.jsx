import { useEffect, useRef } from "react";
import socket from "../socket";

export function useJammerEffect({
  id,
  x,
  y,
  radius,
  frequency,
  interval = 500, // more reasonable interval
}) {
  const prevEmitRef = useRef({ x, y, frequency });

  useEffect(() => {
    const emitInterval = setInterval(() => {
      const hasChanged =
        prevEmitRef.current.x !== x ||
        prevEmitRef.current.y !== y ||
        prevEmitRef.current.frequency !== frequency;

      if (hasChanged) {
        socket.emit("jammer-broadcast", {
          id,
          x,
          y,
          radius,
          effectRadius: 150,
          frequency,
        });

        // Update stored state
        prevEmitRef.current = { x, y, frequency };
      }
    }, interval);

    return () => clearInterval(emitInterval);
  }, [id, x, y, radius, frequency, interval]);
}
