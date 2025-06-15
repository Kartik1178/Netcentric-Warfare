import { Circle } from "react-konva";

const Missile = ({ x, y, color = "red", radius = 6 }) => {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={color}
      stroke="white"
      strokeWidth={1}
      shadowBlur={5}
    />
  );
};

export default Missile;
