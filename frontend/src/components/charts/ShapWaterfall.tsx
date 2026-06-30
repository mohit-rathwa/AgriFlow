import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ShapFeature } from '../../types';

interface ShapWaterfallProps {
  data: ShapFeature[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-dark-800/95 backdrop-blur-xl border border-dark-600/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-sm font-semibold text-white mb-1">{label}</p>
        <p className="text-xs text-dark-300">
          SHAP: <span className={value >= 0 ? 'text-red-400' : 'text-blue-400'}>{value.toFixed(4)}</span>
        </p>
        <p className="text-[10px] text-dark-500 mt-0.5">
          {value >= 0 ? 'Increases' : 'Decreases'} prediction
        </p>
      </div>
    );
  }
  return null;
}

export default function ShapWaterfall({ data }: ShapWaterfallProps) {
  const sortedData = [...data].sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance)).slice(0, 10);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={120}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="importance" radius={[0, 6, 6, 0]} barSize={22}>
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.importance >= 0 ? '#ef4444' : '#3b82f6'}
                fillOpacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
