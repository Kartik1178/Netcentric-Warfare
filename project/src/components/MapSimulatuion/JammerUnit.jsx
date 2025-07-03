import React from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";
import socket from "../socket";
import { useState,useEffect,useRef } from "react";
import { useJammerEffect } from "./JammerEffect";
export default function Jammer({
  id,
  startX,
  startY,
  targetX,
  targetY,
  radius = 5,
   effectRadius = 150, 
  speed = 1.5,
  frequency = "2GHz",
}) {
  const [image] = useImage("/zap.png");
const [x, setX] = useState(startX);
  const [y, setY] = useState(startY);
const effectCircleRef = useRef(null);
 const positionRef = useRef({ x: startX, y: startY });
 useEffect(() => {
    positionRef.current = { x, y };
  }, [x, y]);
  useEffect(() => {
    const interval = setInterval(() => {
       const { x: currentX, y: currentY } = positionRef.current;

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 2) {
        setX((prev) => prev + (dx / distance) * speed);
        setY((prev) => prev + (dy / distance) * speed);
      } else {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [targetX, targetY, speed]);
useJammerEffect({
    id,
    x,
    y,
    radius,
    effectRadius: 150,
    frequency,
    interval: 200, // how often to broadcast, adjust if needed
  });
  useEffect(() => {
    let dashOffset = 0;
    const anim = () => {
      if (effectCircleRef.current) {
        dashOffset = (dashOffset + 1) % 100; // adjust speed
        effectCircleRef.current.dashOffset(dashOffset);
      }
      requestAnimationFrame(anim);
    };
    anim();
  }, []);

   return (
    <Group x={x} y={y}>
      <Circle
        radius={radius}
        fill="red"
        shadowBlur={4}
        shadowColor="black"
      />

      <Circle
        ref={effectCircleRef}
        radius={effectRadius}
        stroke="rgba(255, 0, 0, 0.4)"
        strokeWidth={2}
        dash={[10, 5]}
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
