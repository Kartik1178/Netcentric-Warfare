import React, { useEffect, useRef } from "react";
import { Text } from "react-konva";
import Konva from "konva";

export default function FloatingMessage({ x, y, text, duration = 2 }) {
  const textRef = useRef();

  useEffect(() => {
    const tween = new Konva.Tween({
      node: textRef.current,
      duration,
      y: y - 30,
      opacity: 0,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        // Auto-cleanup from parent
        textRef.current?.destroy();
      },
    });
    tween.play();
  }, [y, duration]);

  return (
    <Text
      ref={textRef}
      x={x}
      y={y}
      text={text}
      fontSize={16}
      fill="yellow"
      fontStyle="bold"
      opacity={1}
      shadowBlur={4}
    />
  );
}
