import React, { useState } from 'react';
import { X, Mountain, Target } from 'lucide-react';

export const DroneParameterModal = ({ drone, onClose, onSimulate }) => {
  const [altitude, setAltitude] = useState(5); // default for drones

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!drone) return;
    onSimulate({
      altitude,
      droneType: drone.name || "Unknown",
      speedMach: Number(drone.specifications?.speed?.replace(/Mach\s?/i, "")) || 0,
    });
  };

  if (!drone) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 border border-slate-700/50 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            {drone.name} - Drone Setup
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">Drone Info</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoCard label="Category" value={drone.category || "Drone"} />
              <InfoCard label="Type" value={drone.type || "Drone"} />
              <InfoCard label="Origin" value={drone.origin || "Unknown"} />
              <InfoCard label="Range" value={drone.specifications?.range || "N/A"} />
              <InfoCard label="Speed" value={drone.specifications?.speed || "N/A"} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <Mountain className="w-4 h-4 text-emerald-400" />
              ALTITUDE (km)
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={altitude}
              onChange={(e) => setAltitude(parseInt(e.target.value) || 0)}
              className="w-full h-2 bg-slate-700 rounded-lg cursor-pointer accent-emerald-500"
            />
            <div className="text-white font-semibold text-center">{altitude} km</div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl text-white font-semibold">
              Cancel
            </button>
            <button onClick={handleSubmit} className="flex-1 py-3 px-6 bg-gradient-to-r from-lime-500 to-green-600 rounded-xl text-white font-bold shadow-lg">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="bg-slate-700/30 rounded-lg p-3">
    <span className="text-slate-400 text-xs block mb-1">{label}</span>
    <span className="text-white font-medium">{value}</span>
  </div>
);
