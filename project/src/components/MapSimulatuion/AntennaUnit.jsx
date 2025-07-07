import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle, Text } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import { useJammerDetection } from "../../hooks/JammerDetection";
import { useCognitiveRadio } from "../../hooks/useCognitiveRadio";

export default function Antenna({
  id,
  x,
  y,
  radius = 20,
  jammerReports,
  setJammerReports,
  currentFrequency,
  setCurrentFrequency,
  availableFrequencies,
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


  useJammerDetection({
    id,
    x,
    y,
    myFrequency: currentFrequency,
    jammerHandler: (isAffected, jammer) => {
      const now = Date.now();
      if (isAffected) {
        jammedUntil.current = now + 1000;
      }
      const stillJammed = now < jammedUntil.current;
      setIsJammed(stillJammed);

      console.log(
        `[Antenna ${id}] Jammed by ${jammer.id}? ${isAffected} → Still jammed? ${stillJammed}`
      );
    },
    setJammerReports,
  });

  useEffect(() => {
    const handleRadarSignal = (data) => {
      const { source, type, payload } = data;

      if (source === "radar" && type === "relay-to-antenna") {
        console.log(`[Antenna ${id}] Received relay-to-antenna:`, payload);

        const emitData = {
          source: "antenna",
          type: "threat-detected",
          from: { x: x ?? 420, y: y ?? 325 },
          to: { x: 560, y: 325 },
          payload,
        };

        if (socket && socket.connected) {
          console.log(`[Antenna ${id}] Scheduling threat signal...`);

          setTimeout(() => {
            if (isJammedRef.current) {
              console.log(`[Antenna ${id}] Jammed during emission! Signal blocked.`);
              return;
            }
            socket.emit("unit-signal", emitData);
            console.log(`[Antenna ${id}] ✅ Emitted threat-detected:`, emitData);
          }, 3000);
        }
      }
    };

    socket.on("relay-to-antenna", handleRadarSignal);
    return () => socket.off("relay-to-antenna", handleRadarSignal);
  }, [x, y]);

  useEffect(() => {
    const handleFrequencyChange = (data) => {
      if (data.unitId !== id) {
        console.log(`[Antenna ${id}] Received frequency-change from ${data.unitId}:`, data);
      }
    };

    socket.on("frequency-change", handleFrequencyChange);
    return () => socket.off("frequency-change", handleFrequencyChange);
  }, [id]);

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
        text={`Freq: ${currentFrequency}`}
        x={-radius}
        y={radius + 5}
        fill="#fff"
        fontSize={12}
      />
    </Group>
  );
}
