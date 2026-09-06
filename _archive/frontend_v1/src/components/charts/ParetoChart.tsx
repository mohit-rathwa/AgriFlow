import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ParetoItem } from '../../types';

interface ParetoChartProps {
  data: ParetoItem[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800/95 backdrop-blur-xl border border-dark-600/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-1.5">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-xs text-dark-300">
            <span className={entry.name === 'delay_hours' ? 'text-agri-400' : 'text-amber-400'}>
              {entry.name === 'delay_hours' ? 'Delay: ' : 'Cumulative: '}
            </span>
            {entry.name === 'delay_hours' ? `${entry.value}h` : `${entry.value.toFixed(1)}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function ParetoChart({ data }: ParetoChartProps) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            yAxisId="left"
            dataKey="delay_hours"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            barSize={40}
            name="delay_hours"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative_pct"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }}
            name="cumulative_pct"
          />
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
