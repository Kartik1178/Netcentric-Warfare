
import GridCanvas from "./MapSimulatuion/GridCanvas";
 export function Simulation() {
    const [objects, setObjects] = useState([]);
    const [logs, setLogs] = useState([]);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setObjects((prev) => prev.map(obj => {
          if (obj.type === "missile") return updateMissilePosition(obj, 1);
          return obj;
        }));
      }, 100);
  
      return () => clearInterval(interval);
    }, []);
  
    return (
      <div className="flex h-screen">
        <GridCanvas objects={objects} />
      </div>
    );
  }