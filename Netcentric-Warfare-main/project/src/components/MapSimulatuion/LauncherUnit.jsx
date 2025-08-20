import React, { useEffect, useState } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";

export default function Launcher({ id, x, y, radius = 20, onLaunchInterceptor }) {
  const [image] = useImage("/launcher.png");

  useEffect(() => {
    const handleSignal = (signal) => {
      const { type, payload, launcherId } = signal;

      // 🔒 Only respond if this signal is meant for this launcher
      if (type !== "interceptor-launch" && type !== "command-launch") return;
      if (launcherId && launcherId !== id) return;

      const { currentX, currentY, vx, vy, id: threatId } = payload;

      const launcherX = x;
      const launcherY = y;

      // Proportional Navigation / simple intercept logic
      const interceptorSpeed = 22;
      const dx0 = currentX - launcherX;
      const dy0 = currentY - launcherY;

      const a = vx * vx + vy * vy - interceptorSpeed * interceptorSpeed;
      const b = 2 * (dx0 * vx + dy0 * vy);
      const c = dx0 * dx0 + dy0 * dy0;

      let tau;
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b + sqrtDisc) / (2 * a);
        const t2 = (-b - sqrtDisc) / (2 * a);
        tau = Math.min(...[t1, t2].filter(t => t > 0));
      }

      if (!tau || !isFinite(tau) || tau <= 0) tau = 1;

      const interceptX = currentX + tau * vx;
      const interceptY = currentY + tau * vy;

      setTimeout(() => {
        if (onLaunchInterceptor) {
          const launchData = {
            launcherX,
            launcherY,
            targetX: interceptX,
            targetY: interceptY,
            threatId,
          };
          onLaunchInterceptor(launchData);
          console.log("🎯 [Launcher LaunchData Prepared]", launchData, { currentX, currentY, vx, vy, tau });
          console.log(`🚀 [Launcher ${id}] Interceptor launched for threat ${threatId}`);
        }
      }, 500);
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
