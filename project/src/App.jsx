import React, { useState } from 'react';
import { Header } from './components/Header.jsx';
import { ThreatDashboard } from './components/ThreatDashboard.jsx';
import { TerritoryMap } from './components/TerritoryMap.jsx';
import { SimulationLog } from './components/SimulationLog.jsx';
import { MissileParameterModal } from './components/MissileParameterModal.jsx';
import { useSimulation } from './hooks/useSimulation.js';

function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    logs,
    radarContacts,
    isActive,
    simulateThreatDetection,
    clearLogs,
    clearRadarContacts,
  } = useSimulation();

  const handleThreatSelect = (threat) => {
    setSelectedThreat(threat);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedThreat(null);
  };

  const handleSimulate = (params) => {
    if (selectedThreat) {
      simulateThreatDetection(params, selectedThreat.name);
    }
  };

  const getSystemStatus = () => {
    if (isActive) return 'active';
    if (radarContacts.some(contact => contact.status === 'active')) return 'alert';
    return 'standby';
  };

  return (
    <div className="h-screen bg-military-dark flex flex-col overflow-hidden">
      <Header 
        systemStatus={getSystemStatus()}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <ThreatDashboard onThreatSelect={handleThreatSelect} />
        
        <TerritoryMap 
          radarContacts={radarContacts}
          isActive={isActive}
        />
        
        <SimulationLog 
          logs={logs}
          onClearLogs={clearLogs}
        />
      </div>

      <MissileParameterModal
        threat={selectedThreat}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSimulate={handleSimulate}
      />
    </div>
  );
}

export default App;