
import React, { useEffect, useState } from "react";
import { Line } from "react-konva";

export default function SignalLayer({ signals}) {
  const [signalLines, setSignalLines] = useState([]);

useEffect(() => {
  const newSignals = signals.map((signal) => ({
    id: Date.now() + Math.random(),
    from: signal.from,
    to: signal.to,
    color: signal.color || "yellow",
    progress: 0,
  }));

  setSignalLines((prev) => [...prev, ...newSignals]);
}, [signals]);


  useEffect(() => {
    const interval = setInterval(() => {
     setSignalLines((prev) =>
  prev
    .map((line) => {
      const newProgress = line.progress + (line.speed || 0.01);
      return {
        ...line,
        progress: newProgress,
      };
    })
    .filter((line) => line.progress <= 1)
);

    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {signalLines.map((line) => {
        const { from, to, progress, color } = line;
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;

        return (
          <Line
            key={line.id}
            points={[from.x, from.y, x, y]}
            stroke={color}
            strokeWidth={2}
            dash={[5, 5]}
            lineCap="round"
            lineJoin="round"
            shadowColor={color}
            shadowBlur={8}
            shadowOpacity={0.5}
          />
        );
      })}
    </>
  );
}
