import React, { useEffect, useState } from 'react';

export const TerritoryMap = ({ radarContacts, isActive }) => {
  const [radarAngle, setRadarAngle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle(prev => (prev + 1.5) % 360);
    }, 60);

    return () => clearInterval(interval);
  }, []);

  const basePositions = [
    { x: 30, y: 70, type: 'naval', name: 'Naval Base Alpha', icon: '⚓' },
    { x: 70, y: 60, type: 'air', name: 'Air Defense Beta', icon: '🛩️' },
    { x: 50, y: 40, type: 'command', name: 'Command Center', icon: '🏢' },
    { x: 20, y: 30, type: 'radar', name: 'Radar Station Gamma', icon: '📡' },
    { x: 80, y: 20, type: 'missile', name: 'Missile Battery Delta', icon: '🚀' },
  ];

  const getContactColor = (contact) => {
    switch (contact.status) {
      case 'intercepted': return 'text-emerald-400';
      case 'neutralized': return 'text-slate-500';
      default: return contact.type === 'threat' ? 'text-red-400' : 'text-blue-400';
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Main radar display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-96 h-96">
          {/* Radar rings */}
          {[1, 2, 3, 4].map((ring) => (
            <div
              key={ring}
              className="absolute border border-blue-400/20 rounded-full"
              style={{
                width: `${ring * 25}%`,
                height: `${ring * 25}%`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
          
          {/* Radar sweep line */}
          <div
            className="absolute w-px h-48 origin-bottom"
            style={{
              background: 'linear-gradient(to top, rgba(59, 130, 246, 0.8), transparent)',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -100%) rotate(${radarAngle}deg)`,
              transformOrigin: 'bottom center',
              filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
            }}
          />
          
          {/* Center command point */}
          <div className="absolute w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg">
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30" />
          </div>
        </div>
      </div>

      {/* Territory boundary */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="territoryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.1)" />
          </linearGradient>
        </defs>
        <polygon
          points="100,100 700,120 650,400 500,480 200,450 80,300"
          fill="url(#territoryGradient)"
          stroke="rgba(59, 130, 246, 0.3)"
          strokeWidth="2"
          strokeDasharray="8,4"
        />
      </svg>

      {/* Defense installations */}
      {basePositions.map((base, index) => (
        <div
          key={index}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
          style={{ left: `${base.x}%`, top: `${base.y}%` }}
        >
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <span className="text-sm">{base.icon}</span>
            </div>
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping" 
                 style={{ animationDelay: `${index * 0.8}s`, animationDuration: '3s' }} />
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-600/50">
            {base.name}
          </div>
        </div>
      ))}

      {/* Threat contacts */}
      {radarContacts.map((contact) => (
        <div
          key={contact.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${getContactColor(contact)}`}
          style={{ left: `${contact.x}%`, top: `${contact.y}%` }}
        >
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-current shadow-lg" />
            {contact.status === 'active' && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-current animate-ping opacity-60" />
            )}
            {contact.status === 'intercepted' && (
              <div className="absolute -inset-2 w-7 h-7 rounded-full border-2 border-current animate-pulse" />
            )}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-slate-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-white border border-slate-600/50">
            {contact.type.toUpperCase()}
          </div>
        </div>
      ))}

      {/* Status panel */}
      <div className="absolute top-6 left-6 bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-white font-medium">Radar Operational</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-400 animate-pulse' : 'bg-blue-400'}`} />
            <span className="text-sm text-white font-medium">
              {isActive ? 'Engagement Active' : 'Defense Ready'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/50">
            <div className="text-xs text-slate-400 space-y-1">
              <div>LAT: 28.6139° N</div>
              <div>LON: 77.2090° E</div>
              <div>GRID: {String.fromCharCode(65 + Math.floor(radarAngle / 30))}{Math.floor(radarAngle / 10)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation controls */}
      <div className="absolute bottom-6 left-6 flex gap-3">
        <button className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700/80 border border-slate-600/50 rounded-lg text-sm text-white font-medium transition-all duration-200 shadow-lg">
          Reset View
        </button>
        <button className="px-4 py-2 bg-blue-600/80 backdrop-blur-sm hover:bg-blue-500/80 border border-blue-500/50 rounded-lg text-sm text-white font-medium transition-all duration-200 shadow-lg">
          Pause Simulation
        </button>
      </div>
    </div>
  );
};