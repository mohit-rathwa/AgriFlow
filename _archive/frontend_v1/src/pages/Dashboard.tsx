import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import KPICard from '../components/ui/KPICard'
import JobStatusBadge from '../components/ui/JobStatusBadge'
import { useDatasets } from '../hooks/useDataset'

// Mock data for dashboard charts (replaced by real API data when connected)
const delayByStage = [
  { stage: 'Transport', delay: 14.2, fill: '#ef4444' },
  { stage: 'Market Arrival', delay: 11.8, fill: '#f97316' },
  { stage: 'Auction', delay: 7.5, fill: '#eab308' },
  { stage: 'Dispatch', delay: 6.9, fill: '#84cc16' },
  { stage: 'Quality Check', delay: 4.3, fill: '#22c55e' },
  { stage: 'Harvest', delay: 2.1, fill: '#06b6d4' },
]

const priceTrend = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  Onion: 1800 + Math.sin(i * 0.8) * 800 + Math.random() * 200,
  Tomato: 2200 + Math.sin(i * 0.6 + 1) * 1000 + Math.random() * 300,
  Rice: 2800 + Math.sin(i * 0.3) * 200 + Math.random() * 100,
  Wheat: 2400 + Math.sin(i * 0.4 + 2) * 150 + Math.random() * 100,
  Potato: 1400 + Math.sin(i * 0.7 + 0.5) * 500 + Math.random() * 150,
}))

const recentJobs = [
  { id: '1', type: 'process_mining', status: 'complete' as const, dataset: 'Mandi 2024 Q1', created: '2 hours ago' },
  { id: '2', type: 'causal_ml', status: 'running' as const, dataset: 'Mandi 2024 Q1', created: '1 hour ago' },
  { id: '3', type: 'prediction', status: 'queued' as const, dataset: 'Mandi 2024 Q1', created: '30 min ago' },
  { id: '4', type: 'process_mining', status: 'failed' as const, dataset: 'Onion Daily', created: '5 hours ago' },
]

const chartColors = ['#22c55e', '#ef4444', '#3b82f6', '#eab308', '#a855f7']

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-dark-400">Agricultural supply chain overview</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <span className="text-lg">+</span>
          Upload Dataset
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Avg Supply Chain Delay"
          value="46.8"
          unit="hours"
          trend="down"
          trendValue="-3.2%"
          color="blue"
          icon="⏱️"
        />
        <KPICard
          title="Top Bottleneck Stage"
          value="Transport"
          unit=""
          trend="neutral"
          trendValue="30% of delays"
          color="red"
          icon="🚛"
        />
        <KPICard
          title="ATE — Cereals"
          value="₹2,263"
          unit="/quintal"
          trend="up"
          trendValue="+12.4%"
          color="green"
          icon="🌾"
        />
        <KPICard
          title="ATE — Perishables"
          value="₹1,847"
          unit="/quintal"
          trend="up"
          trendValue="+8.1%"
          color="amber"
          icon="🥬"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delay by Stage */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Delay by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={delayByStage} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}h`} />
              <YAxis type="category" dataKey="stage" stroke="#64748b" fontSize={12} width={100} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                formatter={(value: number) => [`${value} hours`, 'Avg Delay']}
              />
              <Bar dataKey="delay" radius={[0, 6, 6, 0]}>
                {delayByStage.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Price Trend by Commodity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                formatter={(value: number) => [`₹${Math.round(value)}`, '']}
              />
              <Legend />
              {['Onion', 'Tomato', 'Rice', 'Wheat', 'Potato'].map((commodity, i) => (
                <Line
                  key={commodity}
                  type="monotone"
                  dataKey={commodity}
                  stroke={chartColors[i]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColors[i] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Analysis Jobs</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-dark-700/50">
                <th className="pb-3 font-medium">Job Type</th>
                <th className="pb-3 font-medium">Dataset</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/30">
              {recentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-dark-800/40 transition-colors">
                  <td className="py-3.5 text-sm text-dark-200 capitalize">
                    {job.type.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 text-sm text-dark-300">{job.dataset}</td>
                  <td className="py-3.5">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="py-3.5 text-sm text-dark-400">{job.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
