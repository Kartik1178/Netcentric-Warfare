import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";

export default function Launcher({id, x, y, radius = 20, onLaunchInterceptor }) {
  const [image] = useImage("/launcher.png");

  useEffect(() => {
    const handleSignal = (signal) => { // Renamed 'data' to 'signal' for clarity
      const { from, to, type, payload } = signal;

      // ⚡️ FIXED: Check if signal type is 'interceptor-launch' AND if 'to' coordinates match this launcher's coordinates
      if (type !== "interceptor-launch" || to.x !== x || to.y !== y) {
        return; // Not an interceptor launch command for this specific launcher
      }

      console.log(`[Launcher ${id}] Received interceptor-launch command for missile ${payload.id}`);

      const { currentX, currentY, vx, vy, id: threatId } = payload;

      const launcherX = x;
      const launcherY = y;

      // Proportional Navigation Logic (as provided in your useCentralAI context)
      // This calculates the intercept point based on missile velocity and interceptor speed
      const interceptorSpeed = 22; // must be faster than missile
      const dx0 = currentX - launcherX;
      const dy0 = currentY - launcherY;

      const a = vx * vx + vy * vy - interceptorSpeed * interceptorSpeed;
      const b = 2 * (dx0 * vx + dy0 * vy);
      const c = dx0 * dx0 + dy0 * dy0;

      let tau; // Time to intercept
      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b + sqrtDisc) / (2 * a);
        const t2 = (-b - sqrtDisc) / (2 * a);
        // Choose the smallest positive time to intercept
        tau = Math.min(...[t1, t2].filter(t => t > 0));
      }

      if (!tau || !isFinite(tau) || tau <= 0) {
        console.warn(`[Launcher ${id}] No valid intercept time (tau) found. Using fallback pursuit.`);
        tau = 1; // Fallback to a short pursuit time if calculation fails
      }

      const interceptX = currentX + tau * vx;
      const interceptY = currentY + tau * vy;

      // Call the onLaunchInterceptor callback after a short visual delay
      setTimeout(() => {
        if (onLaunchInterceptor) {
          onLaunchInterceptor({
            launcherX,
            launcherY,
            targetX: interceptX,
            targetY: interceptY,
            threatId,
          });
          console.log(`🚀 [Launcher ${id}] Interceptor launched for threat ${threatId}`);
        } else {
          console.warn(`[Launcher ${id}] onLaunchInterceptor callback is not provided.`);
        }
      }, 500); // Small delay to simulate launch sequence
    };

    // Listen for the general "unit-signal" from the socket
    socket.on("unit-signal", handleSignal);
    return () => socket.off("unit-signal", handleSignal);
  }, [id, x, y, onLaunchInterceptor]); // Add x and y to dependencies for the effect to react to changes

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
