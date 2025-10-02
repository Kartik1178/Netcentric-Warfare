import React, { useEffect, useRef } from "react";
import { Text } from "react-konva";
import Konva from "konva";

export default function FloatingMessage({ text, duration = 2, color = "yellow" }) {
  const textRef = useRef();

  if (!text || typeof text !== "string") return null;

  useEffect(() => {
    if (!textRef.current) return;

    // Start at 0 relative to Group, tween moves UP -30
    const tween = new Konva.Tween({
      node: textRef.current,
      duration: duration,
      y: -30, // move up relative to the Group's origin
      opacity: 0,
      easing: Konva.Easings.EaseInOut,
    });

    tween.play();

    return () => tween.destroy();
  }, [text, duration]);

  return (
    <Text
      ref={textRef}
      x={0}
      y={0}
      text={text}
      fontSize={16}
      fill={color}
      fontStyle="bold"
      opacity={1}
      shadowBlur={4}
      stroke="black"
      strokeWidth={1}
      align="center"
      verticalAlign="middle"
    />
  );
}
