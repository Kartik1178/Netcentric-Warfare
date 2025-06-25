import React from "react";
import { useState,useEffect } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";

export default function Launcher({ x, y, radius = 20 }) {
  const [image] = useImage("/launcher.png");
  const [targets, setTargets] = useState([]);
useEffect(() => {
    socket.on("unit-signal", (data) => {
      const { source, type, payload } = data;

      if (source === "antenna" && type === "threat-detected") {
        console.log("Launcher received threat from antenna", payload);
          setTargets((prev) => [...prev, payload]);
      }
    });

    return () => socket.off("unit-signal");
  }, []);
  return (
    <Group x={x} y={y}>
      {/* Circular background */}
      <Circle
        radius={radius}
        fill="green" // Dodger blue for better contrast
        shadowBlur={4}
        shadowColor="black"
      />
      {/* Missile Image masked to fit circle dimensions */}
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
