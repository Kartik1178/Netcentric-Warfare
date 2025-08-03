// components/Explosion.jsx
import React, { useEffect, useRef } from "react";
import { Circle } from "react-konva";
import Konva from "konva";

const Explosion = ({ x, y, onAnimationEnd }) => {
  const shapeRef = useRef();

  useEffect(() => {
    const tween = new Konva.Tween({
      node: shapeRef.current,
      duration: 0.5,
      radius: 60,
      opacity: 0,
      easing: Konva.Easings.EaseOut,
      onFinish: onAnimationEnd,
    });

    tween.play();
  }, [onAnimationEnd]);

  return (
    <Circle
      ref={shapeRef}
      x={x}
      y={y}
      radius={10}
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndRadius={60}
      fillRadialGradientColorStops={[0, "yellow", 1, "red"]}
      shadowBlur={30}
      shadowColor="orange"
      opacity={0.8}
    />
  );
};

export default Explosion;
