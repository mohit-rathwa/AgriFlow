import { useState } from 'react';

interface ToolCallCardProps {
  name: string;
  args: Record<string, any>;
  result?: string;
  status: 'running' | 'complete' | 'error';
}

const toolMeta: Record<string, { icon: string; color: string; label: string }> = {
  process_mining: { icon: '⚙️', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30', label: 'Process Mining' },
  run_process_mining: { icon: '⚙️', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30', label: 'Process Mining' },
  causal_ml: { icon: '🔬', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30', label: 'Causal ML' },
  run_causal_ml: { icon: '🔬', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30', label: 'Causal ML' },
  prediction: { icon: '🔮', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30', label: 'Prediction' },
  run_prediction: { icon: '🔮', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30', label: 'Prediction' },
  simulation: { icon: '🧪', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30', label: 'Simulation' },
  run_simulation: { icon: '🧪', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30', label: 'Simulation' },
  search: { icon: '🔍', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30', label: 'Search' },
  query_data: { icon: '📊', color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30', label: 'Query Data' },
};

const defaultMeta = { icon: '🛠️', color: 'from-dark-500/20 to-dark-600/10 border-dark-500/30', label: 'Tool' };

export default function ToolCallCard({ name, args, result, status }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = toolMeta[name] || defaultMeta;

  return (
    <div
      className={`my-2 rounded-xl border bg-gradient-to-r ${meta.color} backdrop-blur-sm overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group"
      >
        <span className="text-xl flex-shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark-100 truncate">
            {meta.label}
          </p>
          <p className="text-xs text-dark-400 font-mono truncate">{name}</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'running' && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-medium">Running</span>
            </div>
          )}
          {status === 'complete' && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">✅</span>
              <span className="text-xs text-emerald-400 font-medium">Complete</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">❌</span>
              <span className="text-xs text-red-400 font-medium">Error</span>
            </div>
          )}

          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-dark-700/30">
          {/* Arguments */}
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-500 mb-1.5">Arguments</p>
            <pre className="text-xs text-dark-300 bg-dark-900/60 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {result && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-500 mb-1.5">Result</p>
              <div className="text-xs text-dark-200 bg-dark-900/60 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
