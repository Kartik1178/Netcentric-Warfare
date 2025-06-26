// TerritoryMap.jsx
import GridCanvas from "./MapSimulatuion/GridCanvas";
import { useEffect, useState } from "react";
import socket from "./socket";

export function TerritoryMap({ onLogsUpdate }) {
  const [objects, setObjects] = useState([]);

  useEffect(() => {
    const handleSignal = (data) => {
      const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        source: data.source,
        type: data.type,
        payload: data.payload,
        message: `${data.source} sent ${data.type}`,
      };
      onLogsUpdate?.(logEntry);
    };

    socket.on("unit-signal", handleSignal);
    return () => socket.off("unit-signal", handleSignal);
  }, [onLogsUpdate]);

  useEffect(() => {
    setObjects([
      { id: "m1", type: "missile", x: 300, y: 450 },
      { id: "a1", type: "antenna", x: 420, y: 325 },
      { id: "r1", type: "radar", x: 420, y: 465 },
      { id: "l1", type: "launcher", x: 560, y: 325 },
      { id: "j1", type: "jammer", x: 560, y: 465 },
    ]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setObjects((prev) => [...prev]);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex justify-center items-center">
        <GridCanvas objects={objects} />
      </div>
    </div>
  );
}
