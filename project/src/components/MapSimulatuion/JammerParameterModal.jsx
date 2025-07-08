import React from "react";
import { X, Zap, Radio, Info } from "lucide-react";

export const JammerParameterModal = ({ jammer, onClose, onActivate }) => {
  if ( !jammer) return null;
  const handleActivate = () => {
    if (jammer) {
      const safeRange = Number(jammer.range) || 0;
      const safePower = Number(jammer.power) || 0;

      const jammerData = {
        name: jammer.name,
        frequency: jammer.frequency,
        range: safeRange,
        power: safePower,
        position: { x: 100, y: 100 },
      };

      console.log("📡 Jammer activating with data:", jammerData);

      if (onActivate) {
        onActivate(jammerData);
      }

      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Jammer Parameters
                </h2>
                <p className="text-sm text-slate-400">
                  Detailed specs for selected jammer
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

        {/* BODY */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              {jammer.name}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Type</span>
                <span className="text-white font-semibold">
                  {jammer.type || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Frequency Band</span>
                <span className="text-white font-semibold">
                  {jammer.frequency || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Range</span>
                <span className="text-white font-semibold">
                  {jammer.range || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Power</span>
                <span className="text-white font-semibold">
                  {jammer.power || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Platform</span>
                <span className="text-white font-semibold">
                  {jammer.platform || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Country</span>
                <span className="text-white font-semibold">
                  {jammer.country || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Status</span>
                <span className="text-white font-semibold">
                  {jammer.status || "N/A"}
                </span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <span className="text-slate-400 block mb-1">Year Introduced</span>
                <span className="text-white font-semibold">
                  {jammer.year || "N/A"}
                </span>
              </div>
            </div>

            {jammer.notes && (
              <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                <h4 className="text-slate-400 font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4" />
                  Notes
                </h4>
                <p className="text-white text-sm">{jammer.notes}</p>
              </div>
            )}
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
                onClick={handleActivate}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-red-500/50 rounded-xl transition-all duration-200 text-white font-bold shadow-lg"
              >
                INITIATE SIMULATION
              </button>
            </div>
    
        </div>
      </div>
    </div>
  );
};
