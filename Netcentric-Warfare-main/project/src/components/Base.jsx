import { useEffect, useRef } from "react";
import socket from "./socket";
import { useSDR } from "../hooks/SDRContext";

export function Base({
  id,
  position,
  globalObjects,
  setGlobalObjects,
  incomingSignals,
  setIncomingSignals,
  onLogsUpdate,
  newMissiles = [],
  newJammers = [],
}) {
  const { jammerReports, setJammerReports, currentFrequency, setCurrentFrequency, availableFrequencies } = useSDR();
  const spawnedMissiles = useRef(new Set());

  useEffect(() => {
    const getColorBySource = (source) => ({
      radar: "yellow",
      antenna: "red",
      launcher: "orange",
      jammer: "blue",
      "cognitive-radio": "purple",
      central: "white",
    }[source] || "white");

    const handleUnitSignal = (data) => {
      // Log the signal
      onLogsUpdate?.({
        timestamp: new Date().toLocaleTimeString(),
        source: data.source,
        type: data.type,
        payload: data.payload,
        message: `${data.source} sent ${data.type}`,
      });

      // Add visual signal path to incomingSignals
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

    socket.on("unit-signal", handleUnitSignal);

    return () => {
      socket.off("unit-signal", handleUnitSignal);
    };
  }, [onLogsUpdate, setIncomingSignals]);

  return null; // No visual elements from Base itself
}
