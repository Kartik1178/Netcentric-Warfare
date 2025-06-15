
import { Stage, Layer, Rect } from "react-konva";
import Missile from "./Missile";
import DefenseSystem from "./DefenseSystem";
import Threat from "./Threat";

const GridCanvas = ({ objects, onObjectUpdate }) => {
  const gridSize = 800;
  const cellSize = 100;
  
  const drawGrid = () => {
    let lines = [];
    for (let i = 0; i <= gridSize; i += cellSize) {
      lines.push(<Rect x={i} y={0} width={1} height={gridSize} fill="#333" />);
      lines.push(<Rect x={0} y={i} width={gridSize} height={1} fill="#333" />);
    }
    return lines;
  };

  return (
    <Stage width={gridSize} height={gridSize}>
      <Layer>
        {drawGrid()}
        {objects.map((obj) => {
          if (obj.type === "missile") return <Missile key={obj.id} {...obj} />;
          if (obj.type === "defense") return <DefenseSystem key={obj.id} {...obj} />;
          if (obj.type === "threat") return <Threat key={obj.id} {...obj} />;
        })}
      </Layer>
    </Stage>
  );
};

export default GridCanvas;
