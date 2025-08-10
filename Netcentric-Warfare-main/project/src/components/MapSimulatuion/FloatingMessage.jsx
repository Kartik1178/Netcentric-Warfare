import React, { useEffect, useRef } from "react";
import { Text } from "react-konva";
import Konva from "konva";

export default function FloatingMessage({ x, y, text, duration = 2, color = "yellow" }) {
  const textRef = useRef();
  
  // ⚡️ CRITICAL FIX: Guard against empty or invalid text from the very start.
  const isTextValid = text && typeof text === 'string' && text.trim() !== '';
  const isCoordinatesValid = typeof x === 'number' && isFinite(x) && typeof y === 'number' && isFinite(y);
  
  if (!isTextValid || !isCoordinatesValid) {
    return null;
  }
  
  const displayText = text.trim();

  useEffect(() => {
    if (!textRef.current) return;

    const tween = new Konva.Tween({
      node: textRef.current,
      duration: duration * 5,
      y: y - 30,
      opacity: 0,
      easing: Konva.Easings.EaseInOut,
    });
    tween.play();

    return () => {
      tween.destroy();
    };
  }, [x, y, text, duration, color]);

  return (
    <Text
      ref={textRef}
      x={x}
      y={y}
      text={displayText}
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