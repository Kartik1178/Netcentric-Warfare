import React, { useEffect } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";

export default function Launcher({ id, x, y, radius = 20, onLaunchInterceptor }) {
  const [image] = useImage("/launcher.png");

  // Log initial launcher setup (optional, for reference)
  useEffect(() => {

  }, [id, x, y]);

useEffect(() => {
  const handleSignal = (signal) => {
    const { type, payload, launcherId } = signal;

    if (type !== "interceptor-launch" && type !== "command-launch") return;
    if (launcherId && launcherId !== id) return;

    // Launcher is the one to fire
    const { currentLat, currentLng, vx, vy, id: threatId } = payload;

    console.log("[Launcher] Launch signal received for", threatId, "from launcher", id);

    if (onLaunchInterceptor) {
      // Send lat/lng directly instead of pixel positions
      onLaunchInterceptor({
         launcherId: id, 
        launcherLat: payload.launcherLat ?? payload.lat ?? currentLat,
        launcherLng: payload.launcherLng ?? payload.lng ?? currentLng,
        targetLat: currentLat,
        targetLng: currentLng,
        threatId,
      });
    }
  };

  socket.on("unit-signal", handleSignal);
  return () => socket.off("unit-signal", handleSignal);
}, [id, x, y, onLaunchInterceptor]);


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
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.closePath();
          }}
        />
      )}
    </Group>
  );
}
