
import { useEffect,useRef } from "react";
import socket from "../socket";

export function useJammerEffect({
  id,
  x,
  y,
  radius,
  frequency,
  interval = 100,
}) {
     const latestPosition = useRef({ x, y });
  latestPosition.current = { x, y };
  useEffect(() => {
    const emitInterval = setInterval(() => {
         const { x: currentX, y: currentY } = latestPosition.current;
      socket.emit("jammer-broadcast", {
        id,
           x: currentX,
        y: currentY,
        radius,
         effectRadius: 150,
        frequency,
      });
    }, interval);

    return () => clearInterval(emitInterval);
  }, [id,radius, frequency, interval]);
}
