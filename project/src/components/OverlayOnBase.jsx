import { useMap } from "react-leaflet";

function OverlayOnBase({ base, children }) {
  const map = useMap();
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePos = () => {
      const latlngPoint = map.latLngToContainerPoint(base.coords);
      setPos({ x: latlngPoint.x, y: latlngPoint.y });
    };

    updatePos();
    map.on("move", updatePos);
    map.on("zoom", updatePos);

    return () => {
      map.off("move", updatePos);
      map.off("zoom", updatePos);
    };
  }, [map, base.coords]);

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        left: pos.x - 500, // half of TerritoryMap width
        top: pos.y - 350,  // half of TerritoryMap height
      }}
    >
      {children}
    </div>
  );
}
