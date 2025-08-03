import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, Download, Activity, CheckCircle, AlertCircle } from 'lucide-react';

export const SimulationLog = ({ logs, onClearLogs }) => {
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getPriorityColor = (type) => {
    switch (type) {
      case 'detection': return 'text-red-400 border-red-400/30 bg-red-400/5';
      case 'analysis': return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
      case 'response': return 'text-blue-400 border-blue-400/30 bg-blue-400/5';
      case 'intercept': return 'text-slate-400 border-slate-600/30 bg-slate-400/5';
      case 'status': return 'text-white border-slate-600/30 bg-slate-800/20';
      default: return 'text-white border-slate-600/30 bg-slate-800/20';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'detection': return <Activity className="w-4 h-4" />;
      case 'analysis': return <AlertCircle className="w-4 h-4" />;
      case 'response': return <Terminal className="w-4 h-4" />;
      case 'intercept': return <CheckCircle className="w-4 h-4" />;
      case 'status': return <CheckCircle className="w-4 h-4" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  const exportLogs = () => {
    const logData = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: From ${log.source} → ${JSON.stringify(log.payload)}`
    ).join('\n');
    
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defense_log_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-96 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700/50 h-full flex flex-col shadow-xl">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Simulation Log
              </h2>
              <p className="text-xs text-slate-400">Live mission updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export logs"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            ENTRIES: {logs.length}
          </span>
          <span>•</span>
          <span>LIVE FEED</span>
        </div>
      </div>

      <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Terminal className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium mb-1">No activity logged</p>
            <p className="text-xs">Select a threat to begin simulation</p>
          </div>
        ) : (
          logs.map((log, i) => (
           <div
  key={i}
  className={`rounded-xl border backdrop-blur-sm p-4 hover:bg-slate-700/20 transition-all duration-200 ${getPriorityColor(log.type)}`}
>
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 mt-0.5">{getTypeIcon(log.type)}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-400 font-medium">
          {log.timestamp}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 bg-slate-700/50 rounded-full">
          {log.type}
        </span>
      </div>
      <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap break-words">
        Source: <span className="text-white">{log.source}</span>
        <br />
        Payload: <span className="text-slate-300">{JSON.stringify(log.payload, null, 2)}</span>
      </p>
    </div>
  </div>
</div>

          ))
        )}
      </div>
    </div>
  );
};
