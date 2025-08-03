import { useState } from "react";

import { ThreatDashboard } from "./components/ThreatDashboard";
import { SimulationLog } from "./components/SimulationLog";
import { MissileParameterModal } from "./components/MissileParameterModal";
import FullMap from "./components/FullMap";
import { SDRProvider } from "./hooks/SDRContext";
import { latLngToStageCoords } from "./utils/leafletToKonva";
function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [selectedJammer, setSelectedJammer] = useState(null);
  const [logs, setLogs] = useState([]);
  const [newMissile, setNewMissile] = useState(null);
  const [newJammer, setNewJammer] = useState(null);

  const [step, setStep] = useState("idle"); // idle | altitude | launch
  const [mode, setMode] = useState(null);
  const [altitude, setAltitude] = useState(15);

  const handleLogUpdate = (newLog) => {
    setLogs((prevLogs) => [...prevLogs.slice(-49), newLog]);
  };

 
const handleMapMissileLaunch = ({ latlng, nearestBase }) => {
  if (!window.__leafletMapInstance) {
    console.warn("⚠️ Map instance not ready yet.");
    return;
  }

  const map = window.__leafletMapInstance;

  const startPixel = latLngToStageCoords(map, latlng);
  const targetPixel = latLngToStageCoords(map, {
    lat: nearestBase.coords[0],
    lng: nearestBase.coords[1],
  });
console.log("🔵 Converted Konva startPixel:", startPixel);
console.log("🔵 Converted Konva targetPixel:", targetPixel);
  const missile = {
    id: `missile-${Date.now()}`,
    name: selectedThreat?.name || "Missile",
    baseId: nearestBase.id,
    altitude,
    startPosition: startPixel,
    targetPosition: targetPixel,
    launchPosition: latlng,
    timestamp: Date.now(),
  };

  console.log("🚀 Missile spawn:", missile);
  setNewMissile(missile);

  handleLogUpdate({
    timestamp: new Date().toLocaleTimeString(),
    source: "App",
    type: "launch",
    message: `Missile '${missile.name}' launched from (${latlng.lat.toFixed(2)}, ${latlng.lng.toFixed(2)})`,
    payload: missile,
  });

  setSelectedThreat(null);
  setStep("idle");
};

  const handleThreatSelect = (item, type = "threat") => {
    if (type === "jammer") {
      setMode("jammer");
      setSelectedJammer(item);
    } else {
      setMode("missile");
      setSelectedThreat(item);
      setStep("altitude");
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="h-screen bg-military-dark flex flex-col overflow-hidden">

      
      {/* Step display */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/70 text-white px-4 py-2 rounded-md shadow-md font-bold">
          Current Step: {step.toUpperCase()}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ThreatDashboard onThreatSelect={handleThreatSelect} />

        <div className="flex-1 relative m-2 overflow-hidden">
          <SDRProvider>
            <FullMap
              step={step}
              onMissileLaunch={handleMapMissileLaunch}
              onLogsUpdate={handleLogUpdate}
              newMissile={newMissile}
              newJammer={newJammer}
            />
          </SDRProvider>
        </div>

        <SimulationLog logs={logs} onClearLogs={clearLogs} />
      </div>

      {/* Missile Modal */}
      {selectedThreat && step === "altitude" && (
        <MissileParameterModal
          threat={selectedThreat}
          onClose={() => {
            setSelectedThreat(null);
            setStep("idle");
          }}
          onSimulate={(missileData) => {
            setAltitude(missileData.altitude);
            setStep("launch");
          }}
        />
      )}

      {/* Jammer Modal */}
      {selectedJammer && (
        <JammerParameterModal
          jammer={selectedJammer}
          onActivate={(jammerData) => setNewJammer(jammerData)}
          onClose={() => setSelectedJammer(null)}
        />
      )}
    </div>
  );
}

export default App;
