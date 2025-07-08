import React, { useState } from 'react';
import { X, Target, Mountain, Navigation, Zap, AlertTriangle } from 'lucide-react';

export const MissileParameterModal = ({
  threat,
  onClose,
  onSimulate,
}) => {
  const [parameters, setParameters] = useState({
    altitude: 15,
    distance: 500,
    direction: 45,
    threatType: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (threat) {
      // 🛡️ Defensive coercion
      const safeDirection = Number(parameters.direction) || 0;
      const safeDistance = Number(parameters.distance) || 0;

      // Convert bearing and distance to x,y coordinates
      const rad = safeDirection * (Math.PI / 180);
      const startX = safeDistance * Math.sin(rad);
      const startY = -safeDistance * Math.cos(rad);

      // 🛡️ Defensive Speed_Mach
      const safeMach = Number(threat.Speed_Mach) || 0;
      const speedKmH = safeMach * 1225; // Approx at sea level

      // Normalize speed 0–10
      const normalizedSpeed = safeMach > 0 ? Math.min(10, (safeMach / 20) * 10) : 1;

      // 🛡️ Final check: no NaNs
      console.log("🚀 Simulating missile with:", {
        startX, startY,
        targetX: 420,
        targetY: 465,
        speed: normalizedSpeed,
      });

      if (
        Number.isFinite(startX) &&
        Number.isFinite(startY) &&
        Number.isFinite(normalizedSpeed)
      ) {
        onSimulate({
          ...parameters,
          altitude: Number(parameters.altitude) || 0,
          distance: safeDistance,
          direction: safeDirection,
          threatType: threat.name || "Unknown",
          speed: normalizedSpeed,
          startPosition: { x: startX, y: startY },
          targetPosition: { x: 420, y: 465 },
        });
      } else {
        console.error("❌ Simulation aborted due to invalid values:", {
          startX, startY, normalizedSpeed,
        });
      }

      onClose();
    }
  };

  const handleInputChange = (field, value) => {
    setParameters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if ( !threat) return null;
  const safeMach = Number(threat.Speed_Mach) || 0;
  const safeDistance = Number(parameters.distance) || 1; // avoid div by 0
  const speedKmH = safeMach * 1225;
  const estimatedThreatTime = Math.round(safeDistance / (speedKmH > 0 ? (speedKmH / 3600) : 1));

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
          {/* Threat Info Card — no changes */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {threat.name}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Category</span>
                <span className="text-white font-semibold capitalize">{threat.category || "Unknown"}</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Type</span>
                <span className="text-white font-semibold">{threat.type || "Unknown"}</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Origin</span>
                <span className="text-white font-semibold">{threat.origin || "Unknown"}</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 text-sm block mb-1">Max Range</span>
                <span className="text-white font-semibold">{threat.specifications?.range || "N/A"}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Altitude Slider */}
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
                  onChange={(e) => handleInputChange('altitude', parseInt(e.target.value) || 0)}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-emerald-500"
                />
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <span className="text-white font-semibold">{parameters.altitude}</span>
                  <span className="text-xs text-slate-400 ml-1">km</span>
                </div>
              </div>
            </div>

            {/* Distance Slider */}
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
                  onChange={(e) => handleInputChange('distance', parseInt(e.target.value) || 0)}
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

            {/* Direction Slider */}
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
                  onChange={(e) => handleInputChange('direction', parseInt(e.target.value) || 0)}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-purple-500"
                />
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                  <span className="text-white font-semibold">{parameters.direction}°</span>
                </div>
              </div>
            </div>

            {/* Rest stays the same — threat assessment etc */}
            {/* ... */}

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
