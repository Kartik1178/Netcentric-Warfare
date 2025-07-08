import { useEffect, useState } from "react";
import GridCanvas from "./MapSimulatuion/GridCanvas";
import socket from "./socket";
import { useSDR } from "../hooks/SDRContext";

export function TerritoryMap({ onLogsUpdate,newMissile,newJammer }) {
  const {
    jammerReports,
    setJammerReports,
    currentFrequency,
    setCurrentFrequency,
    availableFrequencies,
  } = useSDR();

  const [objects, setObjects] = useState([]);
  const [incomingSignals, setIncomingSignals] = useState([]);
// 📌 Compute the centroid of all active missiles
const getMissileCentroid = (missiles) => {
  if (missiles.length === 0) return { x: 400, y: 400 }; // fallback center
  const sumX = missiles.reduce((acc, m) => acc + m.x, 0);
  const sumY = missiles.reduce((acc, m) => acc + m.y, 0);
  return { x: sumX / missiles.length, y: sumY / missiles.length };
};

// 📌 Compute the general bearing of threats (optional)
const getThreatBearing = (missiles) => {
  if (missiles.length === 0) return 0;
  const centroid = getMissileCentroid(missiles);
  const baseX = 420; // your base center X
  const baseY = 325; // your base center Y

  const dx = centroid.x - baseX;
  const dy = centroid.y - baseY;

  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;

  return angleDeg;
};

// 📌 Add unit helper functions
const addRadarUnit = (x, y) => {
  const id = `radar-${Date.now()}`;
  setObjects(prev => [...prev, { id, type: "radar", x, y }]);
};

const addAntennaUnit = (x, y) => {
  const id = `antenna-${Date.now()}`;
  setObjects(prev => [...prev, { id, type: "antenna", x, y }]);
};

const addLauncherUnit = (x, y) => {
  const id = `launcher-${Date.now()}`;
  setObjects(prev => [...prev, { id, type: "launcher", x, y }]);
};

  const getColorBySource = (source) => {
    switch (source) {
      case "radar":
        return "yellow";
      case "antenna":
        return "red";
      case "launcher":
        return "orange";
      case "jammer":
        return "blue";
      case "cognitive-radio":
        return "purple";
      default:
        return "white";
    }
  };
 
  const launchInterceptor = ({ launcherX, launcherY, targetX, targetY, threatId }) => {
    const newInterceptor = {
      id: `interceptor-${Date.now()}`,
      type: "interceptor",
      x: launcherX,
      y: launcherY,
      targetX,
      targetY,
      threatId,
      speed: 2,
    };

    setObjects((prev) => [...prev, newInterceptor]);

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "launcher",
      type: "interceptor-launched",
      payload: newInterceptor,
      message: `launcher launched interceptor for threat ${threatId}`,
    });
  };

  const handleUnitSignal = (data) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source: data.source,
      type: data.type,
      payload: data.payload,
      message: `${data.source} sent ${data.type}`,
    };
    onLogsUpdate?.(logEntry);

    if (data.from && data.to) {
      setIncomingSignals((prev) => [
        ...prev,
        {
          from: data.from,
          to: data.to,
          color: getColorBySource(data.source),
          source: data.source,
          type: data.type,
          payload: data.payload,
          createdAt: Date.now(),
        },
      ]);
    }
  };

  const handleRadarRelay = (data) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source: "radar",
      type: "relay-to-antenna",
      payload: data.payload,
      message: `radar sent relay-to-antenna`,
    };
    onLogsUpdate?.(logEntry);

    if (data.from && data.to) {
      setIncomingSignals((prev) => [
        ...prev,
        {
          from: data.from,
          to: data.to,
          color: getColorBySource("radar"),
          source: "radar",
          type: "relay-to-antenna",
          payload: data.payload,
          createdAt: Date.now(),
        },
      ]);
    }
  };

  const handleFrequencyChange = (data) => {
    console.log(`[TerritoryMap] frequency-change received:`, data);

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source: "cognitive-radio",
      type: "frequency-change",
      payload: data,
      message: `${data.unitId} switched ${data.oldFrequency} → ${data.newFrequency}`,
    };
    onLogsUpdate?.(logEntry);

  };

  useEffect(() => {
    socket.on("unit-signal", handleUnitSignal);
    socket.on("relay-to-antenna", handleRadarRelay);
    socket.on("frequency-change", handleFrequencyChange);

    return () => {
      socket.off("unit-signal", handleUnitSignal);
      socket.off("relay-to-antenna", handleRadarRelay);
      socket.off("frequency-change", handleFrequencyChange);
    };
  }, [onLogsUpdate]);
  useEffect(() => {
  const missiles = objects.filter(obj => obj.type === "missile");
  const missileCount = missiles.length;

  if (missileCount === 0) return;

  const radarCount = objects.filter(obj => obj.type === "radar").length;
  const antennaCount = objects.filter(obj => obj.type === "antenna").length;
  const launcherCount = objects.filter(obj => obj.type === "launcher").length;

  // How many units you want per missile (adjustable)
  const neededRadars = Math.ceil(missileCount / 1); // 1 per missile
  const neededAntennas = Math.ceil(missileCount / 1);
  const neededLaunchers = Math.ceil(missileCount / 1);

  const centroid = getMissileCentroid(missiles);
  const bearing = getThreatBearing(missiles);

  // Distance to deploy from centroid toward threat
  const deployDistance = 100;
  const rad = (bearing * Math.PI) / 180;

  const deployX = centroid.x + deployDistance * Math.cos(rad);
  const deployY = centroid.y + deployDistance * Math.sin(rad);

  if (radarCount < neededRadars) {
    addRadarUnit(deployX, deployY);
  }

  if (antennaCount < neededAntennas) {
    addAntennaUnit(deployX + 30, deployY); // slight offset
  }

  if (launcherCount < neededLaunchers) {
    addLauncherUnit(deployX - 30, deployY);
  }

}, [objects]);


  useEffect(() => {
    setObjects([

      { id: "a1", type: "antenna", x: 420, y: 325 },
      { id: "r1", type: "radar", frequency: "2GHz", x: 420, y: 465 },
      { id: "l1", type: "launcher", x: 560, y: 325 },
     
    ]);
  }, []);
  useEffect(() => {
  if (newJammer) {
    // Defensive fallback for position
    const posX = newJammer.position?.x ?? 0;
    const posY = newJammer.position?.y ?? 0;
console.log("✅ newJammer.range", newJammer.range);
    const jammerObj = {
      id: `jammer-${Date.now()}`,
      type: "jammer",
      startX: posX, 
      startY: posY, 
targetX: 470,
        targetY: 400,    radius: 10,   frequency: "2GHz",
        effectRadius:150,  
speed: 1.5,
      
      
    };

    setObjects((prev) => [...prev, jammerObj]);

    onLogsUpdate?.({
      timestamp: new Date().toLocaleTimeString(),
      source: "system",
      type: "jammer-activated",
      payload: jammerObj,
      message: `New jammer '${jammerObj.name}' activated.`,
    });
  }
}, [newJammer]);
   useEffect(() => {
    if (newMissile) {
      const missileObj = {
        id: `missile-${Date.now()}`,
        type: "missile",
         x:0,
      y: 0,
      targetX: Number(newMissile.targetPosition.x),
      targetY: Number(newMissile.targetPosition.y),
      speed: Number(newMissile.speed),
      };

      setObjects((prev) => [...prev, missileObj]);

      onLogsUpdate?.({
        timestamp: new Date().toLocaleTimeString(),
        source: "system",
        type: "missile-simulated",
        payload: missileObj,
        message: `New missile launched towards base.`,
      });
    }
  }, [newMissile]);

  useEffect(() => {
    const interval = setInterval(() => {
      setObjects((prev) => [...prev]);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex justify-center items-center">
        <GridCanvas
          objects={objects}
          incomingSignals={incomingSignals}
          setIncomingSignals={setIncomingSignals}
          onLaunchInterceptor={launchInterceptor}
          jammerReports={jammerReports}
          setJammerReports={setJammerReports}
          currentFrequency={currentFrequency}
          setCurrentFrequency={setCurrentFrequency}
          availableFrequencies={availableFrequencies}
        />
      </div>
    </div>
  );
}
