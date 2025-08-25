// Outside component (shared state)
let activeVisualAntennaId = null;
let activeVisualTimeout = null;
const baseRelayedMissilesMap = new Map();

import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle, Text, Line } from "react-konva";
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
  zoom,
  radius,
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
  const [signalAnimations, setSignalAnimations] = useState([]);

  const isJammedRef = useRef(false);
  const jammedUntil = useRef(0);

  if (!baseRelayedMissilesMap.has(baseId)) baseRelayedMissilesMap.set(baseId, new Set());

  useEffect(() => { isJammedRef.current = isJammed; }, [isJammed]);

  useCognitiveRadio({
    id, jammerReports, availableFrequencies, currentFrequency, setCurrentFrequency
  });

  const previousJammedState = useRef(null);

  useJammerDetection({
    id, x, y,
    myFrequency: currentFrequency,
    jammerHandler: (isAffected) => {
      const now = Date.now();
      if (isAffected) jammedUntil.current = now + 1000;
      const stillJammed = now < jammedUntil.current;
      setIsJammed(stillJammed);
      previousJammedState.current = stillJammed;
    },
  });

  // Radar relay handler
  useEffect(() => {
    const handleRadarSignal = (data) => {
      const { type, payload } = data;
      if (type === "relay-to-antenna" && payload?.baseId === baseId) {
        const relayedSet = baseRelayedMissilesMap.get(baseId);
        if (relayedSet.has(payload.missileId)) return;
        relayedSet.add(payload.missileId);

        // Assign active antenna
        if (!activeVisualAntennaId) {
          activeVisualAntennaId = id;
          clearTimeout(activeVisualTimeout);
          activeVisualTimeout = setTimeout(() => {
            activeVisualAntennaId = null;
          }, 2000);
        }

        // Incoming pulse
        if (activeVisualAntennaId === id) {
          setSignalAnimations((prev) => [
            ...prev,
            { type: "receive", color: "lime", progress: 0 }
          ]);
        }

        setTimeout(() => {
          if (isJammedRef.current) return;

          const signalData = {
            from: { x, y },
            to: CENTRAL_AI_POSITION,
            color: "red",
            source: "antenna",
            type: "relay-to-c2",
            payload,
          };

          emitSignal?.(signalData);
          socket.emit("unit-signal", signalData);

          if (activeVisualAntennaId === id) {
            setSignalAnimations((prev) => [
              ...prev,
              {
                type: "send",
                color: "red",
                progress: 0,
                target: CENTRAL_AI_POSITION
              }
            ]);
          }

          onLogsUpdate?.({
            timestamp: new Date().toLocaleTimeString(),
            source: `Antenna ${id.slice(-4)}`,
            type: "relay-to-c2",
            message: `Relayed missile ${payload.missileId.slice(-4)} to C2 AI.`,
            payload,
          });
        }, 800);
      }
    };

    socket.on("unit-signal", handleRadarSignal);
    return () => socket.off("unit-signal", handleRadarSignal);
  }, [id, x, y, baseId, emitSignal, onLogsUpdate]);

  // Animate signals smoothly
  useEffect(() => {
    if (!signalAnimations.length) return;
    let animFrame;
    const animate = () => {
      setSignalAnimations((prev) =>
        prev
          .map((sig) => ({
            ...sig,
            progress: sig.progress + 0.03, // Faster animation
          }))
          .filter((sig) => sig.progress <= 1)
      );
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [signalAnimations]);

  const frequencyDisplayText =
    currentFrequency != null ? `Freq: ${currentFrequency}` : "Freq: N/A";

  return (
    <Group x={x} y={y}>
      {/* Base antenna circle */}
      <Circle
        radius={radius}
        fill={isJammed ? "gray" : "green"}
        shadowBlur={6}
        shadowColor={isJammed ? "darkgray" : "lime"}
      />

      {/* Antenna image */}
      {image && (
        <Image
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.closePath();
          }}
        />
      )}

      {/* Frequency label */}
      <Text
        text={frequencyDisplayText}
        x={-radius}
        y={radius + 5}
        fill="#fff"
        fontSize={Math.max(10, radius * 0.7)}
        align="center"
        width={radius * 2}
      />

      {/* Signal visuals */}
      {activeVisualAntennaId === id &&
        signalAnimations.map((sig, idx) => {
          if (sig.type === "receive") {
            const r = radius + sig.progress * 25;
            return (
              <Circle
                key={idx}
                radius={r}
                stroke={sig.color}
                strokeWidth={3}
                opacity={1 - sig.progress}
                shadowBlur={15}
                shadowColor={sig.color}
              />
            );
          } else if (sig.type === "send" && sig.target) {
            const tx = sig.target.x - x;
            const ty = sig.target.y - y;
            return (
              <Line
                key={idx}
                points={[0, 0, tx * sig.progress, ty * sig.progress]}
                stroke={sig.color}
                strokeWidth={4}
                opacity={1 - sig.progress * 0.8}
                shadowColor={sig.color}
                shadowBlur={20}
                dash={[10, 5]}
              />
            );
          }
          return null;
        })}
    </Group>
  );
}
