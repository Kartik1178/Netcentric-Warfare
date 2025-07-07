// App.jsx

import React, { useState, useEffect } from 'react';
import socket from "./socket";
import { Header } from './components/Header.jsx';
import { ThreatDashboard } from './components/ThreatDashboard.jsx';
import { TerritoryMap } from './components/TerritoryMap.jsx';
import { SimulationLog } from './components/SimulationLog.jsx';
import { MissileParameterModal } from './components/MissileParameterModal.jsx';

function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [simulationObjects, setSimulationObjects] = useState([]);

  // 🟢 Function to update logs
  const handleLogUpdate = (newLog) => {
    setLogs((prevLogs) => [...prevLogs.slice(-49), newLog]);
  };

  const clearLogs = () => setLogs([]);

  // 🟢 Send threat data to backend
  const handleSimulate = (params) => {
    socket.emit("start-threat-simulation", params);
  };

  // 🟢 Handle incoming events from backend
  useEffect(() => {
    socket.on("simulation-log", handleLogUpdate);

    socket.on("missile-update", (missileData) => {
      setSimulationObjects((prev) => {
        const others = prev.filter((obj) => obj.id !== missileData.id);
        return [...others, missileData];
      });
    });

    socket.on("interceptor-update", (interceptor) => {
      setSimulationObjects((prev) => {
        const others = prev.filter((obj) => obj.id !== interceptor.id);
        return [...others, interceptor];
      });
    });

    socket.on("remove-object", (id) => {
      setSimulationObjects((prev) => prev.filter((obj) => obj.id !== id));
    });

    return () => {
      socket.off("simulation-log");
      socket.off("missile-update");
      socket.off("interceptor-update");
      socket.off("remove-object");
    };
  }, []);

  return (
    <div className="h-screen bg-military-dark flex flex-col overflow-hidden">
      <Header systemStatus="active" />

      <div className="flex-1 flex overflow-hidden">
        <ThreatDashboard onThreatSelect={(threat) => {
          setSelectedThreat(threat);
          setIsModalOpen(true);
        }} />

        <div className="m-2">
          <TerritoryMap
            onLogsUpdate={handleLogUpdate}
            objects={simulationObjects}
            setSimulationObjects={setSimulationObjects}
          />
        </div>

        <SimulationLog logs={logs} onClearLogs={clearLogs} />
      </div>

      {isModalOpen && selectedThreat && (
        <MissileParameterModal
          threat={selectedThreat}
          isOpen={isModalOpen}
          onClose={() => {
            setSelectedThreat(null);
            setIsModalOpen(false);
          }}
          onSimulate={handleSimulate}
        />
      )}
    </div>
  );
}

export default App;
