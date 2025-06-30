import React, { useEffect } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";

export default function Antenna({ x, y, radius = 20 }) {
  const [image] = useImage("/antenna.png");

  useEffect(() => {
    const handleRadarSignal = (data) => {
      const { source, type, payload } = data;

      if (source === "radar" && type === "relay-to-antenna") {
        console.log("📡 Antenna received signal from radar:", payload);

        const emitData = {
          source: "antenna",
          type: "threat-detected",
          from: { x: x ?? 420, y: y ?? 325 },
          to: { x: 560, y: 325 }, // Example: launcher location
          payload,
        };

        if (socket && socket.connected) {
          console.log("⏳ Will emit signal from antenna after 5s:", emitData);
          // ✅ Delay the emit using setTimeout — only for this signal
          setTimeout(() => {
            socket.emit("unit-signal", emitData);
            console.log("📤 Antenna emitted signal:", emitData);
          }, 5000); // 5-second delay
        } else {
          console.error("🚫 Socket is not connected.");
        }
      }
    };

    socket.on("relay-to-antenna", handleRadarSignal);
    return () => socket.off("relay-to-antenna", handleRadarSignal);
  }, [x, y]);

  return (
    <Group x={x} y={y}>
      <Circle radius={radius} fill="green" shadowBlur={4} shadowColor="black" />
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
