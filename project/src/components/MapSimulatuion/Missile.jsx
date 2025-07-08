// Missile.jsx
import React, { useEffect, useRef, useState } from "react";
import { Image, Group, Circle } from "react-konva";
import useImage from "use-image";

export default function Missile({
  x,
  y,
  targetX,
  targetY,
  speed,
  radius = 20,
}) {
  const [image] = useImage("/missile.png");
const [position, setPosition] = useState({
    x: Number(x) || 0,
    y: Number(y) || 0,
  });
  const animRef = useRef(null);

  useEffect(() => {
    const animate = () => {
      const dx = Number(targetX) - position.x;
      const dy = Number(targetY) - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) {
        cancelAnimationFrame(animRef.current);
        return;
      }

      const stepX = (dx / distance) * Number(speed);
      const stepY = (dy / distance) * Number(speed);

      setPosition((prev) => ({
        x: prev.x + stepX,
        y: prev.y + stepY,
      }));
      

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetX, targetY, speed]);

  return (
    <Group x={position.x} y={position.y}>
      <Circle
        radius={radius}
        fill="red"
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
