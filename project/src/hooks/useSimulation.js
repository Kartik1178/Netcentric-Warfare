import { useState, useCallback, useRef } from 'react';
import { defenseSystems } from '../data/threats.js';

export const useSimulation = () => {
  const [logs, setLogs] = useState([]);
  const [radarContacts, setRadarContacts] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const logIdCounter = useRef(0);

  const addLog = useCallback((message, type, priority = 'medium') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const newLog = {
      id: `log-${logIdCounter.current++}`,
      timestamp,
      type,
      message,
      priority
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep only last 50 logs
  }, []);

  const getOptimalDefenseSystem = (threatParams) => {
    // Logic to select appropriate defense system based on threat characteristics
    const { speed, altitude, distance, threatType } = threatParams;
    
    if (speed > 6000) { // Hypersonic threats
      return defenseSystems.find(sys => sys.name === 'THAAD') || defenseSystems[0];
    } else if (distance > 1000) { // Long-range threats
      return defenseSystems.find(sys => sys.name === 'S-400 Triumf') || defenseSystems[0];
    } else if (altitude < 10) { // Low-altitude threats
      return defenseSystems.find(sys => sys.name === 'Iron Dome') || defenseSystems[0];
    } else if (threatType.toLowerCase().includes('ballistic')) {
      return defenseSystems.find(sys => sys.name === 'Patriot PAC-3') || defenseSystems[0];
    } else {
      return defenseSystems.find(sys => sys.name === 'Akash NG') || defenseSystems[0];
    }
  };

  const simulateThreatDetection = useCallback((params, threatName) => {
    setIsActive(true);
    
    // Initial detection
    addLog(
      `RADAR DETECTION: ${threatName} detected at ${params.distance}km, altitude ${params.altitude}km, speed Mach ${(params.speed / 343).toFixed(1)}`,
      'detection',
      'high'
    );

    // Add radar contact
    const newContact = {
      id: `contact-${Date.now()}`,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      type: 'threat',
      status: 'active',
      speed: params.speed,
      heading: params.direction
    };

    setRadarContacts(prev => [...prev, newContact]);

    // Simulate threat analysis
    setTimeout(() => {
      const threatLevel = params.speed > 3000 || params.distance < 200 ? 'CRITICAL' :
                         params.speed > 1500 || params.distance < 500 ? 'HIGH' : 'MODERATE';
      addLog(
        `THREAT ANALYSIS: Classification ${threatLevel} - Computing trajectory and impact probability`,
        'analysis',
        threatLevel === 'CRITICAL' ? 'critical' : 'medium'
      );
    }, 1000);

    // Select optimal defense system
    setTimeout(() => {
      const defenseSystem = getOptimalDefenseSystem(params);
      addLog(
        `COUNTERMEASURE SELECTED: ${defenseSystem.name} system activated - ${defenseSystem.type}`,
        'response',
        'high'
      );
    }, 2500);

    // Simulate launch sequence
    setTimeout(() => {
      addLog('LAUNCH SEQUENCE: Interceptor missile launched - Tracking target', 'response', 'high');
    }, 3500);

    // Simulate interception
    setTimeout(() => {
      const success = Math.random() > 0.15; // 85% success rate with advanced systems
      if (success) {
        addLog('INTERCEPT SUCCESS: Target neutralized - Debris tracking initiated', 'intercept', 'high');
        setRadarContacts(prev => 
          prev.map(contact => 
            contact.id === newContact.id 
              ? { ...contact, status: 'intercepted' }
              : contact
          )
        );
      } else {
        addLog('INTERCEPT FAILED: Secondary defense systems engaging', 'intercept', 'critical');
        // Simulate secondary defense attempt
        setTimeout(() => {
          const secondarySuccess = Math.random() > 0.3; // 70% secondary success rate
          if (secondarySuccess) {
            addLog('SECONDARY INTERCEPT: Target neutralized by backup system', 'intercept', 'high');
            setRadarContacts(prev => 
              prev.map(contact => 
                contact.id === newContact.id 
                  ? { ...contact, status: 'intercepted' }
                  : contact
              )
            );
          } else {
            addLog('CRITICAL ALERT: Target breach detected - Emergency protocols activated', 'intercept', 'critical');
          }
        }, 2000);
      }
    }, 4500);

    // Reset simulation status
    setTimeout(() => {
      setIsActive(false);
      addLog('SYSTEM STATUS: All clear - Defense grid ready for next threat', 'status', 'low');
    }, 7000);

  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const clearRadarContacts = useCallback(() => {
    setRadarContacts([]);
  }, []);

  return {
    logs,
    radarContacts,
    isActive,
    simulateThreatDetection,
    clearLogs,
    clearRadarContacts,
    addLog
  };
};