import { useEffect, useState } from "react";
import GridCanvas from "./MapSimulatuion/GridCanvas";
import socket from "./socket";
import { useSDR } from "../hooks/SDRContext";

export function TerritoryMap({ onLogsUpdate }) {
  const {
    jammerReports,
    setJammerReports,
    currentFrequency,
    setCurrentFrequency,
    availableFrequencies,
  } = useSDR();

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
      case "cognitive-radio":
        return "purple";
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
      speed: 2,
    };

    setObjects((prev) => [...prev, newInterceptor]);

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "launcher",
      type: "interceptor-launched",
      payload: newInterceptor,
      message: `launcher launched interceptor for threat ${threatId}`,
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

  const handleFrequencyChange = (data) => {
    console.log(`[TerritoryMap] frequency-change received:`, data);

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source: "cognitive-radio",
      type: "frequency-change",
      payload: data,
      message: `${data.unitId} switched ${data.oldFrequency} → ${data.newFrequency}`,
    };
    onLogsUpdate?.(logEntry);

  };

  useEffect(() => {
    socket.on("unit-signal", handleUnitSignal);
    socket.on("relay-to-antenna", handleRadarRelay);
    socket.on("frequency-change", handleFrequencyChange);

    return () => {
      socket.off("unit-signal", handleUnitSignal);
      socket.off("relay-to-antenna", handleRadarRelay);
      socket.off("frequency-change", handleFrequencyChange);
    };
  }, [onLogsUpdate]);

  useEffect(() => {
    setObjects([
      { id: "m1", type: "missile", x: 300, y: 450 },
      { id: "a1", type: "antenna", x: 420, y: 325 },
      { id: "r1", type: "radar", frequency: "2GHz", x: 420, y: 465 },
      { id: "l1", type: "launcher", x: 560, y: 325 },
      {
        id: "j1",
        type: "jammer",
        startX: 30,
        startY: 30,
        targetX: 470,
        targetY: 400,
        radius: 10,
        frequency: "2GHz",
        speed: 1.5,
      },
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
        <GridCanvas
          objects={objects}
          incomingSignals={incomingSignals}
          setIncomingSignals={setIncomingSignals}
          onLaunchInterceptor={launchInterceptor}
          jammerReports={jammerReports}
          setJammerReports={setJammerReports}
          currentFrequency={currentFrequency}
          setCurrentFrequency={setCurrentFrequency}
          availableFrequencies={availableFrequencies}
        />
      </div>
    </div>
  );
}
