import React, { useState } from 'react';
import { X, Target, Gauge, Mountain, Navigation, Zap, AlertTriangle } from 'lucide-react';

export const MissileParameterModal = ({
  threat,
  isOpen,
  onClose,
  onSimulate,
}) => {
  const [parameters, setParameters] = useState({
    speed: 1200,
    altitude: 15,
    distance: 500,
    direction: 45,
    threatType: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (threat) {
      onSimulate({
        ...parameters,
        threatType: threat.name,
      });
      onClose();
    }
  };

  const handleInputChange = (field, value) => {
    setParameters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen || !threat) return null;

  const estimatedThreatTime = Math.round(parameters.distance / (parameters.speed / 3600));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Threat Simulation Parameters
                </h2>
                <p className="text-sm text-slate-400">
                  Configure incoming missile characteristics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Threat Information Card */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {threat.name}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Category</span>
                <span className="text-white font-semibold capitalize">{threat.category}</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Type</span>
                <span className="text-white font-semibold">{threat.type}</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Origin</span>
                <span className="text-white font-semibold">{threat.origin}</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Max Range</span>
                <span className="text-white font-semibold">{threat.specifications.range}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Speed Parameter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Gauge className="w-4 h-4 text-blue-400" />
                VELOCITY (km/h)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="300"
                  max="6000"
                  step="50"
                  value={parameters.speed}
                  onChange={(e) => handleInputChange('speed', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-blue-500"
                />
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <span className="text-white font-semibold">{parameters.speed}</span>
                  <span className="text-xs text-slate-400 ml-1">km/h</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Mach {(parameters.speed / 343).toFixed(1)} • {parameters.speed < 1200 ? 'Subsonic' : parameters.speed < 3430 ? 'Supersonic' : 'Hypersonic'}
              </div>
            </div>

            {/* Altitude Parameter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Mountain className="w-4 h-4 text-emerald-400" />
                ALTITUDE (km)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={parameters.altitude}
                  onChange={(e) => handleInputChange('altitude', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-emerald-500"
                />
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <span className="text-white font-semibold">{parameters.altitude}</span>
                  <span className="text-xs text-slate-400 ml-1">km</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {parameters.altitude < 10 ? 'Low altitude' : parameters.altitude < 50 ? 'Medium altitude' : 'High altitude'}
              </div>
            </div>

            {/* Distance Parameter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Target className="w-4 h-4 text-amber-400" />
                DISTANCE FROM BASE (km)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={parameters.distance}
                  onChange={(e) => handleInputChange('distance', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-amber-500"
                />
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <span className="text-white font-semibold">{parameters.distance}</span>
                  <span className="text-xs text-slate-400 ml-1">km</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                ETA: ~{estimatedThreatTime} seconds
              </div>
            </div>

            {/* Direction Parameter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <Navigation className="w-4 h-4 text-purple-400" />
                BEARING (degrees)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={parameters.direction}
                  onChange={(e) => handleInputChange('direction', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-purple-500"
                />
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <span className="text-white font-semibold">{parameters.direction}°</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {parameters.direction < 90 ? 'Northeast' : parameters.direction < 180 ? 'Southeast' : parameters.direction < 270 ? 'Southwest' : 'Northwest'}
              </div>
            </div>

            {/* Threat Assessment */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white">THREAT ASSESSMENT</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <span className="text-slate-400 text-sm block mb-1">Threat Level</span>
                  <span className={`font-bold ${
                    parameters.speed > 3000 || parameters.distance < 200 ? 'text-red-400' :
                    parameters.speed > 1500 || parameters.distance < 500 ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {parameters.speed > 3000 || parameters.distance < 200 ? 'CRITICAL' :
                     parameters.speed > 1500 || parameters.distance < 500 ? 'HIGH' :
                     'MODERATE'}
                  </span>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <span className="text-slate-400 text-sm block mb-1">Intercept Window</span>
                  <span className="text-white font-semibold">{Math.max(5, estimatedThreatTime - 10)}s</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-xl transition-all duration-200 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-500/50 rounded-xl transition-all duration-200 text-white font-bold shadow-lg"
              >
                INITIATE SIMULATION
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};