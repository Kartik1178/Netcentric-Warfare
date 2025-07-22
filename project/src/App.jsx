

import React, { useState } from 'react';
import { Header } from './components/Header.jsx';
import { ThreatDashboard } from './components/ThreatDashboard.jsx';
import { TerritoryMap } from './components/TerritoryMap.jsx';
import { SimulationLog } from './components/SimulationLog.jsx';
import { MissileParameterModal } from './components/MissileParameterModal.jsx';
import { SDRProvider } from './hooks/SDRContext.jsx';
import { JammerParameterModal } from './components/MapSimulatuion/JammerParameterModal.jsx';
function App() {
  const [selectedThreat, setSelectedThreat] = useState(null);
    const [selectedJammer, setSelectedJammer] = useState(null);
  const [logs, setLogs] = useState([]);
const [newMissile, setNewMissile] = useState(null);
const [newJammer, setNewJammer] = useState(null);
  const handleLogUpdate = (newLog) => {
    setLogs((prevLogs) => [...prevLogs.slice(-49), newLog]);
  };
  const handleThreatSelect = (item, type = 'threat') => {
    if (type === 'jammer') {
      setSelectedJammer(item);
    } else {
      setSelectedThreat(item);
    }
  };
  const clearLogs = () => setLogs([]);

  return (
    <div className="h-screen bg-military-dark flex flex-col overflow-hidden">
      <Header systemStatus="active" />

      <div className="flex-1 flex overflow-hidden">
         <ThreatDashboard onThreatSelect={handleThreatSelect} />
        <div className="m-2">
          <SDRProvider>
          <TerritoryMap onLogsUpdate={handleLogUpdate} 
          newMissile={newMissile} newJammer={newJammer}/>
        </SDRProvider>
        </div>
        
        <SimulationLog logs={logs} onClearLogs={clearLogs} />
     
      </div>
 {selectedThreat && (
      <MissileParameterModal
        threat={selectedThreat}
        onClose={() => {
          setSelectedThreat(null);
        }}
           onSimulate={(missileData) => {
    const missileWithId = {
      ...missileData,
      id: `missile-${Date.now()}-${Math.random()}`,
    };
    setNewMissile(missileWithId);
  }}
      />)}
   {selectedJammer && (
        <JammerParameterModal
          jammer={selectedJammer}
           onActivate={(jammerData) => {
    setNewJammer(jammerData); 
  }}
          onClose={() => setSelectedJammer(null)}
        />
      )}
    </div>
  );
}

export default App;
