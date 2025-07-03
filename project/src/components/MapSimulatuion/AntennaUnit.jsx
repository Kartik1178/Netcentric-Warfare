import React, { useEffect, useState, useRef } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import { useJammerDetection } from "./JammerDetection";

export default function Antenna({ id = "antenna", x, y, radius = 20, frequency = "2GHz" }) {
  const [image] = useImage("/antenna.png");

  const [isJammed, setIsJammed] = useState(false);
  const isJammedRef = useRef(false);
  const jammedUntil = useRef(0);

  useEffect(() => {
    isJammedRef.current = isJammed;
  }, [isJammed]);

  useJammerDetection({
    id,
    x,
    y,
    myFrequency: frequency,
    jammerHandler: (isAffected, jammer) => {
      const now = Date.now();
      if (isAffected) {
        jammedUntil.current = now + 1000; // Jam for 1s
      }
      const stillJammed = now < jammedUntil.current;
      setIsJammed(stillJammed);

      console.log(`[Antenna ${id}] Jammed by ${jammer.id}? ${isAffected} → Still jammed? ${stillJammed}`);
    },
  });

  useEffect(() => {
    const handleRadarSignal = (data) => {
      const { source, type, payload } = data;

      if (source === "radar" && type === "relay-to-antenna") {
        console.log("📡 Antenna received signal from radar:", payload);

        const emitData = {
          source: "antenna",
          type: "threat-detected",
          from: { x: x ?? 420, y: y ?? 325 },
          to: { x: 560, y: 325 },
          payload,
        };

        if (socket && socket.connected) {
          console.log("⏱️ Will emit signal from antenna after 3s:", emitData);

          setTimeout(() => {
            if (isJammedRef.current) {
              console.log(`[Antenna ${id}] Jammed during emission! Signal blocked.`);
              return; // Do not emit if jammed
            }
            socket.emit("unit-signal", emitData);
            console.log("✅ Antenna emitted signal:", emitData);
          }, 3000);
        } else {
          console.error("❌ Socket is not connected.");
        }
      }
    };

    socket.on("relay-to-antenna", handleRadarSignal);
    return () => socket.off("relay-to-antenna", handleRadarSignal);
  }, [x, y]);

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
    </Group>
  );
}
