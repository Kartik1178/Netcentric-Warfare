import React from 'react';
import { Shield } from 'lucide-react';

export const Header = ({ systemStatus }) => {
  const getStatusColor = () => {
    switch (systemStatus) {
      case 'active': return 'text-emerald-400';
      case 'alert': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'active': return 'SYSTEM ACTIVE';
      case 'alert': return 'THREAT DETECTED';
      default: return 'STANDBY MODE';
    }
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Netcentric Warfare Simulation
            </h1>
            <p className="text-xs text-slate-400 font-medium">Defense Command Interface</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${getStatusColor().replace('text-', 'bg-')} animate-pulse`} />
          <div>
            <span className={`text-sm font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <div className="text-xs text-slate-400">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};