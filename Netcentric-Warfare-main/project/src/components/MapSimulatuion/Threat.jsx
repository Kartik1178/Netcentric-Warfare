import { Rect, Text, Group } from "react-konva";

const Threat = ({ x, y, label = "Threat", type = "air" }) => {
  const colors = {
    land: "#a83232",
    air: "#3264a8",
    sea: "#3297a8",
  };

  return (
    <Group x={x} y={y}>
      <Rect width={30} height={30} fill={colors[type] || "gray"} cornerRadius={6} />
      <Text text={label} fontSize={10} fill="white" y={32} width={40} />
    </Group>
  );
};

export default Threat;
