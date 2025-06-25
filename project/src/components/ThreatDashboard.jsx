import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Target, AlertTriangle, Zap } from 'lucide-react';
import { threatDatabase } from '../data/threats.js';

export const ThreatDashboard = ({ onThreatSelect }) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['air']));

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'air': return '✈️';
      case 'land': return '🚀';
      case 'sea': return '🚢';
      case 'submarine': return '🛥️';
      default: return '⚡';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'air': return 'from-sky-500 to-blue-600';
      case 'land': return 'from-amber-500 to-orange-600';
      case 'sea': return 'from-blue-500 to-cyan-600';
      case 'submarine': return 'from-purple-500 to-indigo-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const categorizedThreats = threatDatabase.reduce((acc, threat) => {
    if (!acc[threat.category]) {
      acc[threat.category] = [];
    }
    acc[threat.category].push(threat);
    return acc;
  }, {});

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 h-full overflow-hidden flex flex-col shadow-xl">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Enemy Threats
            </h2>
            <p className="text-xs text-slate-400">
              Select target to initiate simulation
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.entries(categorizedThreats).map(([category, threats]) => (
          <div key={category} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden shadow-lg">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 bg-gradient-to-br ${getCategoryColor(category)} rounded-lg shadow-md`}>
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                </div>
                <div className="text-left">
                  <span className="font-semibold text-white text-sm uppercase tracking-wide">
                    {category}
                  </span>
                  <div className="text-xs text-slate-400">
                    {threats.length} systems available
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
                  {threats.length}
                </span>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {expandedCategories.has(category) && (
              <div className="border-t border-slate-700/50">
                {threats.map((threat) => (
                  <button
                    key={threat.id}
                    onClick={() => onThreatSelect(threat)}
                    className="w-full p-4 text-left hover:bg-slate-700/30 transition-all duration-200 border-b border-slate-700/30 last:border-b-0 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-3 h-3 text-red-400 group-hover:text-red-300 transition-colors" />
                          <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                            {threat.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                          {threat.type} • {threat.origin}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-700/30 rounded-lg p-2">
                            <span className="text-slate-500 block">Range</span>
                            <span className="text-white font-medium">{threat.specifications.range}</span>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-2">
                            <span className="text-slate-500 block">Speed</span>
                            <span className="text-white font-medium">{threat.specifications.speed}</span>
                          </div>
                        </div>
                      </div>
                      <Zap className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};