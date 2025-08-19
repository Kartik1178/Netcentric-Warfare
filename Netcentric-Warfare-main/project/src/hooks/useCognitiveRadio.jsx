import { useEffect } from "react";
import socket from "../components/socket";
export function useCognitiveRadio({
  id,
  jammerReports=[],
  availableFrequencies,
  currentFrequency,
  setCurrentFrequency,
}) {
  useEffect(() => {
    const cleanFrequencies = availableFrequencies.filter(
      freq => !jammerReports[freq] || jammerReports[freq] === 0
    );

    if (cleanFrequencies.length === 0) {
      console.log(`[${id}] No clean frequencies, staying on ${currentFrequency}`);
      return;
    }

    if (!cleanFrequencies.includes(currentFrequency)) {
      const newFreq = cleanFrequencies[0];
      console.log(`[${id}] Switching from ${currentFrequency} → ${newFreq}`);
      setCurrentFrequency(newFreq);
        socket.emit("frequency-change", {
        unitId: id,
        oldFrequency: currentFrequency,
        newFrequency: newFreq,
        timestamp: Date.now(),
      });

      console.log(`[${id}] Emitted frequency-change: ${currentFrequency} -> ${newFreq}`);
    }
  }, [jammerReports, availableFrequencies, currentFrequency, setCurrentFrequency, id]);
}
