import { useEffect, useState } from 'react';

export default function OverlayOnBase({ map, base, children }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!map || !base) return;

    const updatePosition = () => {
      const point = map.latLngToContainerPoint(base.coords);
      setPosition({ x: point.x, y: point.y });
    };

    updatePosition();
    map.on('move zoom resize', updatePosition);

    return () => {
      map.off('move zoom resize', updatePosition);
    };
  }, [map, base]);

  return (
    <div
      className="absolute z-[9999] pointer-events-none"
      style={{
        left: position.x - 600, // center by half width
        top: position.y - 400,  // center by half height
        width: 1200,
        height: 800,
      }}
    >
      <div className="pointer-events-auto w-full h-full">
        {children}
      </div>
    </div>
  );
}
