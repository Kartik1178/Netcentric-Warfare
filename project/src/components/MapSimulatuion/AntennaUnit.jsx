import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle, Text } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import { useJammerDetection } from "../../hooks/JammerDetection";
import { useCognitiveRadio } from "../../hooks/useCognitiveRadio";
import { CENTRAL_AI_POSITION } from "../../constants/AIconstant";

export default function Antenna({
  id,
  x,
  y,
  baseId, // Corrected prop name to baseId for consistency
  radius = 20,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
  emitSignal, // This prop is used for visual signals on the Konva canvas
  onLogsUpdate // NEW: onLogsUpdate prop for sending logs to the UI
}) {
  const [image] = useImage("/antenna.png");

  const [isJammed, setIsJammed] = useState(false);
  const isJammedRef = useRef(false);
  const jammedUntil = useRef(0);

  useEffect(() => {
    isJammedRef.current = isJammed;
  }, [isJammed]);

  useCognitiveRadio({
    id,
    jammerReports,
    availableFrequencies,
    currentFrequency,
    setCurrentFrequency,
  });

  const previousJammedState = useRef(null);

  useJammerDetection({
    id,
    x,
    y,
    myFrequency: currentFrequency,
    jammerHandler: (isAffected, jammer) => {
      const now = Date.now();
      if (isAffected) jammedUntil.current = now + 1000;

      const stillJammed = now < jammedUntil.current;
      setIsJammed(stillJammed);

      // Only log when jammed state changes
      if (previousJammedState.current !== stillJammed) {
        console.log(
          `[Antenna ${id}] Jammed by ${jammer.id}? ${isAffected} → Still jammed? ${stillJammed}`
        );
        previousJammedState.current = stillJammed;
      }
    },
  });

  useEffect(() => {
    const handleRadarSignal = (data) => {
      const { source, type, payload } = data;

      // Check if the signal is from a radar and intended for this specific antenna
      if (type === "relay-to-antenna" && payload?.targetAntennaId === id) {
        console.log(`[Antenna ${id}] Received relay-to-antenna from ${source}:`, payload);
        // NEW: Send log to simulation UI when signal is received from radar
        onLogsUpdate?.({
            timestamp: new Date().toLocaleTimeString(),
            source: `Antenna ${id.substring(id.length - 4)}`,
            type: "signal_received",
            message: `Received threat from ${source.substring(source.length - 4)}`,
            payload: { missileId: payload.id, sourceUnit: source }
        });

        if (socket && socket.connected) {
          console.log(`[Antenna ${id}] Scheduling threat signal relay to Central AI...`);

          setTimeout(() => {
            if (isJammedRef.current) {
              console.log(`[Antenna ${id}] Jammed during emission! Signal blocked.`);
              // NEW: Log blocked signal to simulation UI
              onLogsUpdate?.({
                  timestamp: new Date().toLocaleTimeString(),
                  source: `Antenna ${id.substring(id.length - 4)}`,
                  type: "signal_blocked",
                  message: `Jammed! Signal for ${payload.id.substring(payload.id.length - 4)} blocked.`,
                  payload: { missileId: payload.id, status: "blocked" }
              });
              return;
            }
            const signalData = {
              from: { x, y }, // Antenna's pixel coordinates
              to: CENTRAL_AI_POSITION, // Central AI's pixel coordinates
              color: "red",
              source: "antenna",
              type: "relay-to-c2",
              payload, // The original missile detection payload
            };
            if (emitSignal) { // For visual line drawing on canvas
              emitSignal(signalData);
            }
            // Emit the signal to the Central AI via the socket
            socket.emit("unit-signal", signalData); // This is the main signal to AI
            console.log(`[Antenna ${id}] ✅ Emitted relay-to-c2:`, payload);
            // NEW: Send log to simulation UI when signal is emitted to C2
            onLogsUpdate?.({
                timestamp: new Date().toLocaleTimeString(),
                source: `Antenna ${id.substring(id.length - 4)}`,
                type: "signal_relayed",
                message: `Relayed threat ${payload.id.substring(payload.id.length - 4)} to Central AI.`,
                payload: { missileId: payload.id, targetUnit: "CentralAI" }
            });
          }, 1000); // Simulate relay delay
        }
      }
    };

    // Listen for general "unit-signal" events
    socket.on("unit-signal", handleRadarSignal);

    // FIX: Cleanup listener using the correct event name
    return () => socket.off("unit-signal", handleRadarSignal);
  }, [id, x, y, emitSignal, onLogsUpdate]); // Added onLogsUpdate to dependencies


  useEffect(() => {
    const handleFrequencyChange = (data) => {
      if (data.unitId !== id) {
        console.log(`[Antenna ${id}] Received frequency-change from ${data.unitId}:`, data);
      }
    };

    socket.on("frequency-change", handleFrequencyChange);
    return () => socket.off("frequency-change", handleFrequencyChange);
  }, [id]);

  // Ensure the frequency text is always a valid string for Konva
  const frequencyDisplayText = currentFrequency != null ? `Freq: ${currentFrequency}`.trim() : "Freq: N/A";
  const finalFrequencyText = frequencyDisplayText === "" ? "Freq: Unknown" : frequencyDisplayText;


  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill={isJammed ? "gray" : "green"}
        shadowBlur={4}
        shadowColor="black"
      />
      {image && (
        <Image
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
            ctx.closePath();
          }}
        />
      )}
      <Text
        text={finalFrequencyText} // Use the robustly generated text
        x={-radius}
        y={radius + 5}
        fill="#fff"
        fontSize={12}
      />
    </Group>
  );
}
