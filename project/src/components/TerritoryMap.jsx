import { useEffect, useState } from "react";
import GridCanvas from "./MapSimulatuion/GridCanvas";
import socket from "./socket";

export function TerritoryMap({ onLogsUpdate }) {
  const [objects, setObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]);

  const getColorBySource = (source) => {
    switch (source) {
      case "radar":
        return "yellow";
      case "antenna":
        return "red";
      case "launcher":
        return "orange";
      case "jammer":
        return "blue";
      default:
        return "white";
    }
  };

const launchInterceptor = ({ launcherX, launcherY, targetX, targetY, threatId }) => {
  const newInterceptor = {
    id: `interceptor-${Date.now()}`,
    type: "interceptor",
    x: launcherX,
    y: launcherY,
    targetX,
    targetY,
    threatId,
    speed: 2
  };

  setObjects(prev => [...prev, newInterceptor]);

  onLogsUpdate?.({
    timestamp: new Date().toLocaleTimeString(),
    source: "launcher",
    type: "interceptor-launched",
    payload: newInterceptor,
    message: `launcher launched interceptor for threat ${threatId}`
  });
};


  const handleUnitSignal = (data) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source: data.source,
      type: data.type,
      payload: data.payload,
      message: `${data.source} sent ${data.type}`,
    };
    onLogsUpdate?.(logEntry);

    if (data.from && data.to) {
      setIncomingSignals((prev) => [
        ...prev,
        {
          from: data.from,
          to: data.to,
          color: getColorBySource(data.source),
          source: data.source,
          type: data.type,
          payload: data.payload,
            createdAt: Date.now(),
        },
      ]);
    }
  };

  const handleRadarRelay = (data) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source: "radar",
      type: "relay-to-antenna",
      payload: data.payload,
      message: `radar sent relay-to-antenna`,
    };
    onLogsUpdate?.(logEntry);

    if (data.from && data.to) {
      setIncomingSignals((prev) => [
        ...prev,
        {
          from: data.from,
          to: data.to,
          color: getColorBySource("radar"),
          source: "radar",
          type: "relay-to-antenna",
          payload: data.payload,
          createdAt: Date.now(),

        },
      ]);
    }
  };

  useEffect(() => {
    socket.on("unit-signal", handleUnitSignal);
    socket.on("relay-to-antenna", handleRadarRelay);

    return () => {
      socket.off("unit-signal", handleUnitSignal);
      socket.off("relay-to-antenna", handleRadarRelay);
    };
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
      setObjects((prev) => [...prev]); // Keeps simulation rendering alive
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex justify-center items-center">
        <GridCanvas
          objects={objects}
          incomingSignals={incomingSignals}
          setIncomingSignals={setIncomingSignals}
         onLaunchInterceptor={launchInterceptor}
        />
      </div>
    </div>
  );
}
