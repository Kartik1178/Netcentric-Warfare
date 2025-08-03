import React, { useState } from 'react';
import { X, Mountain, AlertTriangle, Target } from 'lucide-react';

export const MissileParameterModal = ({ threat, onClose, onSimulate }) => {
  const [altitude, setAltitude] = useState(15);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!threat) return;

    // ✅ Pass altitude & basic missile info
    onSimulate({
      altitude,
      threatType: threat.name || "Unknown",
      speedMach: Number(threat.specifications?.speed?.replace(/Mach\s?/i, "")) || 0,
    });

    
  };

  if (!threat) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 border border-slate-700/50 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {threat.name} - Simulation Setup
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Missile Basic Info */}
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-red-400" />
              Missile Info
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoCard label="Category" value={threat.category || "Unknown"} />
              <InfoCard label="Type" value={threat.type || "Unknown"} />
              <InfoCard label="Origin" value={threat.origin || "Unknown"} />
              <InfoCard label="Range" value={threat.specifications?.range || "N/A"} />
              <InfoCard label="Speed" value={threat.specifications?.speed || "N/A"} />
              <InfoCard label="RF Signature" value={threat.rfSignature || "Unknown"} />
            </div>
          </div>

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
                value={altitude}
                onChange={(e) => setAltitude(parseInt(e.target.value) || 0)}
                className="flex-1 h-2 bg-slate-700 rounded-lg cursor-pointer accent-emerald-500"
              />
              <div className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-2 min-w-[120px] text-center">
                <span className="text-white font-semibold">{altitude}</span>
                <span className="text-xs text-slate-400 ml-1">km</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-xl text-white font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-500/50 rounded-xl text-white font-bold shadow-lg"
            >
              Confirm Altitude
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component
const InfoCard = ({ label, value }) => (
  <div className="bg-slate-700/30 rounded-lg p-3">
    <span className="text-slate-400 text-xs block mb-1">{label}</span>
    <span className="text-white font-medium">{value}</span>
  </div>
);
