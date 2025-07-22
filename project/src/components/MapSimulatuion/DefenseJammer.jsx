import React, { useEffect, useRef, useState } from "react";
import { Circle, Group, Text, Image as KonvaImage } from "react-konva";
import socket from "../socket";
import useImage from "use-image";

export default function DefenseJammer({
  id,
  x,
  y,
  radius = 20,
  jamRadius = 150,
  currentFrequency,
  cooldownTime = 10000, // 10s cooldown
}) {
  const [isActive, setIsActive] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [pulse, setPulse] = useState(jamRadius);
  const pulseDirection = useRef(1);
  const [image] = useImage("/jammer.png");

  // JAMMING EVENT LISTENER
  useEffect(() => {
    const handleJamCommand = ({ missile, jammerId }) => {
      if (jammerId !== id) return;
      if (isOnCooldown) {
        console.log(`[Jammer ${id}] ⚠️ Still cooling down...`);
        return;
      }

      console.log(`[Jammer ${id}] ✅ Jamming missile ${missile.id}`);
      setIsActive(true);
      setIsOnCooldown(true);
      setCooldownSeconds(cooldownTime / 1000);

      // Emit jammer-active event
      socket.emit("jammer-active", {
        jammerId: id,
        x,
        y,
        radius: jamRadius,
        frequency: currentFrequency,
      });

      // Stop jamming after 3s
      setTimeout(() => {
        setIsActive(false);
      }, 3000);

      // Start cooldown timer
      const cooldownInterval = setInterval(() => {
        setCooldownSeconds((sec) => {
          if (sec <= 1) {
            clearInterval(cooldownInterval);
            setIsOnCooldown(false);
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    };

    socket.on("command-jam", handleJamCommand);
    return () => socket.off("command-jam", handleJamCommand);
  }, [id, isOnCooldown, cooldownTime, x, y, jamRadius, currentFrequency]);

  // PULSE ANIMATION DURING ACTIVE JAM
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setPulse((prev) => {
        if (prev > jamRadius + 10) pulseDirection.current = -1;
        if (prev < jamRadius - 10) pulseDirection.current = 1;
        return prev + pulseDirection.current * 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isActive, jamRadius]);

  return (
    <Group x={x} y={y}>
      {/* Jamming Pulse Effect */}
      {isActive && (
        <Circle
          radius={pulse}
          fill="rgba(255,0,0,0.2)"
          stroke="red"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}

      {/* Cooldown Gray Ring */}
      {isOnCooldown && (
        <Circle
          radius={jamRadius}
          stroke="gray"
          dash={[8, 4]}
          strokeWidth={1}
          opacity={0.3}
        />
      )}

      {/* Base Jammer Unit */}
      <Circle
        radius={radius}
        fill={isActive ? "purple" : isOnCooldown ? "#666" : "#444"}
        shadowBlur={isActive ? 12 : 4}
        shadowColor="black"
      />

      {/* Image */}
      {image && (
        <KonvaImage
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
        />
      )}

      {/* Label */}
      <Text
        text={
          isOnCooldown
            ? `Cooling: ${cooldownSeconds}s`
            : `Jammer ${id}`
        }
        y={radius + 4}
        fontSize={12}
        fill="#fff"
        align="center"
        offsetX={radius}
        width={radius * 2}
      />
    </Group>
  );
}
