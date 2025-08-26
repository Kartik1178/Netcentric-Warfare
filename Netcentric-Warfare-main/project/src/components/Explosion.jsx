import React, { useEffect, useRef } from "react";
import { Circle } from "react-konva";
import Konva from "konva";

const Explosion = ({ x, y, onAnimationEnd }) => {
  const shapeRef = useRef();

  useEffect(() => {
    if (!shapeRef.current) return;

    const tween = new Konva.Tween({
      node: shapeRef.current,
      duration: 0.5,
      scaleX: 6, // scale from 1 → 6
      scaleY: 6,
      opacity: 0,
      easing: Konva.Easings.EaseOut,
      onFinish: onAnimationEnd,
    });

    tween.play();

    return () => tween.destroy(); // cleanup
  }, [onAnimationEnd]);

  return (
    <Circle
      ref={shapeRef}
      x={x}
      y={y}
      radius={10} // base radius, will scale up
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndRadius={10} // relative to radius
      fillRadialGradientColorStops={[0, "yellow", 1, "red"]}
      shadowBlur={30}
      shadowColor="orange"
      opacity={0.8}
    />
  );
};

export default Explosion;
