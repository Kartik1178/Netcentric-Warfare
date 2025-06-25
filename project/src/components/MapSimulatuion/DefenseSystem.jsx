import { Star, Text, Group, Circle } from "react-konva";

const DefenseSystem = ({ x, y, label = "Iron Dome", range = 100 }) => {
  return (
    <Group x={x} y={y}>
      {/* Range visual */}
      <Circle radius={range} stroke="lightblue" dash={[4, 4]} strokeWidth={2} opacity={1} />
      
      {/* Defense unit icon */}
      <Star
        numPoints={5}
        innerRadius={5}
        outerRadius={12}
        fill="#38b000"
        stroke="white"
        strokeWidth={1}
      />
      <Text text={label} fontSize={10} fill="white" y={16} x={-20} width={60} align="center" />
    </Group>
  );
};

export default DefenseSystem;
