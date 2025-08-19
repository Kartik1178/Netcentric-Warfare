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
  baseId,
  radius = 20,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
  emitSignal,
  onLogsUpdate,
}) {
  const [image] = useImage("/antenna.png");
  const [isJammed, setIsJammed] = useState(false);
  const isJammedRef = useRef(false);
  const jammedUntil = useRef(0);

  const relayedMissilesRef = useRef(new Set()); // track missiles already relayed

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

      if (type === "relay-to-antenna" && payload?.baseId === baseId) {
        // Only relay if this missile hasn't been sent yet
        if (relayedMissilesRef.current.has(payload.missileId)) return;
        relayedMissilesRef.current.add(payload.missileId);

        console.log(`[Antenna ${id}] Received relay-to-antenna from ${source}:`, payload);

        if (socket && socket.connected) {
          setTimeout(() => {
            if (isJammedRef.current) {
              console.log(`[Antenna ${id}] Jammed during emission! Signal blocked.`);
              return;
            }

            const signalData = {
              from: { x, y },
              to: CENTRAL_AI_POSITION,
              color: "red",
              source: "antenna",
              type: "relay-to-c2",
              payload,
            };

            if (emitSignal) emitSignal(signalData);
            socket.emit("unit-signal", signalData);

            if (onLogsUpdate) {
              onLogsUpdate({
                timestamp: new Date().toLocaleTimeString(),
                source: `Antenna ${id.slice(-4)}`,
                type: "relay-to-c2",
                message: `Relayed missile ${payload.missileId.slice(-4)} to C2 AI.`,
                payload,
              });
            }

            console.log(`[Antenna ${id}] ✅ Emitted relay-to-c2:`, payload);
          }, 1000);
        }
      }
    };

    socket.on("unit-signal", handleRadarSignal);
    return () => socket.off("unit-signal", handleRadarSignal);
  }, [id, x, y, baseId, emitSignal, onLogsUpdate]);

  const frequencyDisplayText = currentFrequency != null ? `Freq: ${currentFrequency}`.trim() : "Freq: N/A";

  return (
    <Group x={x} y={y}>
      <Circle radius={radius} fill={isJammed ? "gray" : "green"} shadowBlur={4} shadowColor="black" />
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
      <Text text={frequencyDisplayText || "Freq: Unknown"} x={-radius} y={radius + 5} fill="#fff" fontSize={12} />
    </Group>
  );
}
