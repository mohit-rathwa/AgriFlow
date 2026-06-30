import { useState } from 'react';

interface DataQualityFlagProps {
  type: 'encoding' | 'missing' | 'outlier' | 'msp_bug';
  count: number;
}

const flagConfig: Record<string, { icon: string; color: string; bgColor: string; description: string }> = {
  encoding: {
    icon: '🔤',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    description: 'Encoding issues detected in text fields',
  },
  missing: {
    icon: '⏰',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    description: 'Missing timestamps or date fields',
  },
  outlier: {
    icon: '📈',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    description: 'Statistical outliers detected in values',
  },
  msp_bug: {
    icon: '🐛',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    description: 'MSP (Minimum Support Price) data anomalies',
  },
};

export default function DataQualityFlag({ type, count }: DataQualityFlagProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = flagConfig[type];

  if (count === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-105 ${config.bgColor} ${config.color}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span>{config.icon}</span>
        <span>{count}</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-800 border border-dark-600/50 rounded-lg shadow-xl z-50 whitespace-nowrap animate-fade-in">
          <p className="text-xs text-dark-200 font-medium">{config.description}</p>
          <p className={`text-xs mt-0.5 ${config.color}`}>{count} issue{count !== 1 ? 's' : ''} found</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-dark-800 border-r border-b border-dark-600/50 transform rotate-45" />
        </div>
      )}
    </div>
  );
}
