import React, { useEffect } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket"; 

export default function Antenna({ x, y, radius = 20 }) {
  const [image] = useImage("/antenna.png");

  useEffect(() => {
    const handleSignal = (data) => {
      const { source, type, payload } = data;

      if (source === "radar" && type === "relay-to-antenna") {
        console.log(" Antenna received radar detection:", payload);
        socket.emit("unit-signal", {
          source: "antenna",
          type: "threat-detected",
          payload,
        });
      }
    };

    socket.on("unit-signal", handleSignal);

   
    return () => {
      socket.off("unit-signal", handleSignal);
    };
  }, []);

  return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill="green"
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
