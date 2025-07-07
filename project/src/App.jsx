

import React, { useState } from 'react';
import { Header } from './components/Header.jsx';
import { ThreatDashboard } from './components/ThreatDashboard.jsx';
import { TerritoryMap } from './components/TerritoryMap.jsx';
import { SimulationLog } from './components/SimulationLog.jsx';
import { MissileParameterModal } from './components/MissileParameterModal.jsx';
import { SDRProvider } from './hooks/SDRContext.jsx';

function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState([]);

  const handleLogUpdate = (newLog) => {
    setLogs((prevLogs) => [...prevLogs.slice(-49), newLog]);
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="h-screen bg-military-dark flex flex-col overflow-hidden">
      <Header systemStatus="active" />

      <div className="flex-1 flex overflow-hidden">
        <ThreatDashboard onThreatSelect={setSelectedThreat} />
        <div className="m-2">
          <SDRProvider>
          <TerritoryMap onLogsUpdate={handleLogUpdate} />
        </SDRProvider>
        </div>
        
        <SimulationLog logs={logs} onClearLogs={clearLogs} />
     
      </div>

      <MissileParameterModal
        threat={selectedThreat}
        isOpen={isModalOpen}
        onClose={() => {
          setSelectedThreat(null);
          setIsModalOpen(false);
        }}
        onSimulate={() => {}}
      />
    </div>
  );
}

export default App;
