import { useState } from "react";
import { DroneParameterModal } from "./components/DroneParameterModal";
import { ArtilleryParameterModal } from "./components/ArtilleryParameterModal";
import { MissileParameterModal } from "./components/MissileParameterModal";
import { ThreatDashboard } from "./components/ThreatDashboard";
import { SimulationLog } from "./components/SimulationLog";
import FullMap from "./components/FullMap";
import { SDRProvider } from "./hooks/SDRContext";
import { latLngToStageCoords } from "./utils/leafletToKonva";


function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [selectedJammer, setSelectedJammer] = useState(null);
  const [logs, setLogs] = useState([]);

  const [newMissile, setNewMissile] = useState(null);
  const [newDrone, setNewDrone] = useState(null);
  const [newArtillery, setNewArtillery] = useState(null);
  const [newJammer, setNewJammer] = useState(null);

  const [step, setStep] = useState("idle"); // idle | altitude | launch
  const [mode, setMode] = useState(null);
  const [altitude, setAltitude] = useState(15);

  const handleLogUpdate = (newLog) => {
    setLogs((prevLogs) => [...prevLogs.slice(-49), newLog]);
  };

  // Handles launches from the map
  const handleMapThreatLaunch = ({ latlng, nearestBase }) => {
    if (!window.__leafletMapInstance) return;
    const map = window.__leafletMapInstance;
    const startPixel = latLngToStageCoords(map, latlng);
    const targetPixel = latLngToStageCoords(map, {
      lat: nearestBase.coords[0],
      lng: nearestBase.coords[1],
    });

    const threatType = ["missile", "drone", "artillery", "jammer"].includes(mode)
      ? mode
      : "missile";

    const threat = {
      id: `${threatType}-${Date.now()}`,
      name: selectedThreat?.name || threatType.charAt(0).toUpperCase() + threatType.slice(1),
      baseId: nearestBase.id,
      type: threatType,
      altitude,
      startPosition: startPixel,
      targetPosition: targetPixel,
      launchPosition: latlng,
      timestamp: Date.now(),
    };

    // Assign to appropriate state
    if (threatType === "missile") setNewMissile(threat);
    else if (threatType === "drone") setNewDrone(threat);
    else if (threatType === "artillery") setNewArtillery(threat);
    else if (threatType === "jammer") setNewJammer(threat);

    handleLogUpdate({
      timestamp: new Date().toLocaleTimeString(),
      source: "App",
      type: "launch",
      message: `${threatType.charAt(0).toUpperCase() + threatType.slice(1)} '${threat.name}' launched from (${latlng.lat.toFixed(
        2
      )}, ${latlng.lng.toFixed(2)})`,
      payload: threat,
    });

    setSelectedThreat(null);
    setStep("idle");
  };

  const handleThreatSelect = (item, type = "threat") => {
    if (type === "jammer") {
      setMode("jammer");
      setSelectedJammer(item);
      return;
    }

    const itemType = item.type.toLowerCase();
    if (itemType.includes("drone")) {
      setMode("drone");
      setSelectedThreat(item);
      setStep("altitude");
    } else if (itemType.includes("artillery") || itemType.includes("cannon") || itemType.includes("howitzer")) {
      setMode("artillery");
      setSelectedThreat(item);
      setStep("altitude");
    } else {
      setMode("missile");
      setSelectedThreat(item);
      setStep("altitude");
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="h-screen bg-military-dark flex flex-col overflow-hidden">
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
              onMissileLaunch={handleMapThreatLaunch}
              onLogsUpdate={handleLogUpdate}
              newMissile={newMissile}
              newDrone={newDrone}
              newArtillery={newArtillery}
              newJammer={newJammer}
            />
          </SDRProvider>
        </div>
        <SimulationLog logs={logs} onClearLogs={clearLogs} />
      </div>

      {/* Missile Modal */}
      {selectedThreat && step === "altitude" && mode === "missile" && (
        <MissileParameterModal
          threat={selectedThreat}
          onClose={() => {
            setSelectedThreat(null);
            setStep("idle");
          }}
          onSimulate={(data) => {
            setAltitude(data.altitude);
            setStep("launch");
          }}
        />
      )}

      {/* Drone Modal */}
      {selectedThreat && step === "altitude" && mode === "drone" && (
        <DroneParameterModal
          drone={selectedThreat}
          onClose={() => {
            setSelectedThreat(null);
            setStep("idle");
          }}
          onSimulate={(data) => {
            setAltitude(data.altitude);
            setStep("launch");
          }}
        />
      )}

      {/* Artillery Modal */}
      {selectedThreat && step === "altitude" && mode === "artillery" && (
        <ArtilleryParameterModal
          artillery={selectedThreat}
          onClose={() => {
            setSelectedThreat(null);
            setStep("idle");
          }}
          onSimulate={(data) => {
            setAltitude(data.altitude);
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
