interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: string;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  delay?: number;
}

const colorClasses = {
  green: {
    bg: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/20',
    icon: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/10',
    text: 'text-emerald-400',
  },
  blue: {
    bg: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    icon: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/10',
    text: 'text-blue-400',
  },
  amber: {
    bg: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    icon: 'from-amber-500 to-amber-600',
    shadow: 'shadow-amber-500/10',
    text: 'text-amber-400',
  },
  red: {
    bg: 'from-red-500/10 to-red-600/5',
    border: 'border-red-500/20',
    icon: 'from-red-500 to-red-600',
    shadow: 'shadow-red-500/10',
    text: 'text-red-400',
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/20',
    icon: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/10',
    text: 'text-purple-400',
  },
};

export default function KPICard({ title, value, unit, trend, trendValue, icon, color = 'green', delay = 0 }: KPICardProps) {
  const c = colorClasses[color];

  return (
    <div
      className={`glass-card-hover p-6 bg-gradient-to-br ${c.bg} border ${c.border} animate-slide-up`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.icon} flex items-center justify-center text-lg shadow-lg ${c.shadow}`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-400'
                : trend === 'down'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-dark-600/50 text-dark-400'
            }`}
          >
            {trend === 'up' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l5-5 5 5" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-5 5-5-5" />
              </svg>
            )}
            {trend === 'neutral' && <span>→</span>}
            {trendValue || (trend === 'neutral' ? '0%' : '')}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-dark-400 font-medium mb-1">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
          {unit && <span className="text-sm text-dark-400 font-medium">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
