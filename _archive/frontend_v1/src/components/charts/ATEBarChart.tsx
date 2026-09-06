import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ErrorBar,
} from 'recharts';
import type { ATEItem } from '../../types';

interface ATEBarChartProps {
  data: ATEItem[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: ATEItem }>; label?: string }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-dark-800/95 backdrop-blur-xl border border-dark-600/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-1.5">{label}</p>
        <p className="text-xs text-dark-300">
          ATE: <span className={item.ate >= 0 ? 'text-emerald-400' : 'text-red-400'}>{item.ate.toFixed(3)}</span>
        </p>
        <p className="text-xs text-dark-400">
          95% CI: [{item.ci_low.toFixed(3)}, {item.ci_high.toFixed(3)}]
        </p>
      </div>
    );
  }
  return null;
}

export default function ATEBarChart({ data }: ATEBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    errorRange: [d.ate - d.ci_low, d.ci_high - d.ate],
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="commodity"
            width={100}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
          <Bar dataKey="ate" radius={[0, 6, 6, 0]} barSize={28}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.ate >= 0 ? '#22c55e' : '#ef4444'}
                fillOpacity={0.8}
              />
            ))}
            <ErrorBar
              dataKey="errorRange"
              width={6}
              strokeWidth={1.5}
              stroke="#94a3b8"
              direction="x"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
