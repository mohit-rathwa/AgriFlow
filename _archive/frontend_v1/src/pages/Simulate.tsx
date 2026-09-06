import { useState } from 'react'
import { useDatasets } from '../hooks/useDataset'
import KPICard from '../components/ui/KPICard'
import api from '../services/api'

const SEASONS = ['kharif', 'rabi', 'zaid'] as const
const COMMODITIES = ['Onion', 'Tomato', 'Wheat', 'Rice', 'Potato', 'Maize', 'Mustard']

interface SimResult {
  spoilage_pct: number
  baseline_spoilage_pct: number
  spoilage_reduction_pct: number
  value_at_risk: number
  value_saved: number
  intervention_cost: number
  roi: number
  breakdown: Record<string, number>
}

export default function Simulate() {
  const { data: datasets } = useDatasets()
  const [selectedDataset, setSelectedDataset] = useState('')
  const [coldChain, setColdChain] = useState(30)
  const [season, setSeason] = useState<string>('kharif')
  const [commodity, setCommodity] = useState('Onion')
  const [truckIncrease, setTruckIncrease] = useState(10)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)

  const handleSimulate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/simulate', {
        dataset_id: selectedDataset || undefined,
        cold_chain_pct: coldChain,
        season,
        commodity,
        truck_increase_pct: truckIncrease,
      })
      setResult(res.data)
    } catch (err) {
      console.error('Simulation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatINR = (val: number) => {
    if (val >= 1e7) return `₹${(val / 1e7).toFixed(1)} Cr`
    if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)} L`
    return `₹${val.toLocaleString()}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">What-If Simulation</h1>
        <p className="mt-1 text-dark-400">Model supply chain intervention scenarios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Scenario Parameters</h3>

            {/* Dataset */}
            <div>
              <label className="block text-sm text-dark-400 mb-1.5">Dataset (optional)</label>
              <select className="input-field" value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)}>
                <option value="">Use default parameters</option>
                {datasets?.map((ds: any) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </div>

            {/* Cold Chain */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <label className="text-dark-400">Cold-chain infrastructure increase</label>
                <span className="text-agri-400 font-semibold">{coldChain}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={coldChain}
                onChange={(e) => setColdChain(Number(e.target.value))}
                className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-agri-500"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            {/* Season */}
            <div>
              <label className="block text-sm text-dark-400 mb-1.5">Season</label>
              <div className="grid grid-cols-3 gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all
                      ${season === s
                        ? 'bg-agri-500/20 text-agri-400 border border-agri-500/30'
                        : 'bg-dark-800/60 text-dark-400 border border-dark-700/50 hover:bg-dark-700/60'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Commodity */}
            <div>
              <label className="block text-sm text-dark-400 mb-1.5">Commodity</label>
              <select className="input-field" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Truck Capacity */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <label className="text-dark-400">Additional truck capacity</label>
                <span className="text-blue-400 font-semibold">{truckIncrease}%</span>
              </div>
              <input
                type="range" min={0} max={50} value={truckIncrease}
                onChange={(e) => setTruckIncrease(Number(e.target.value))}
                className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>0%</span><span>25%</span><span>50%</span>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={loading}
              className="btn-primary w-full text-base py-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Simulating...
                </span>
              ) : '🔬 Run Simulation'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!result && !loading && (
            <div className="glass-card p-12 flex flex-col items-center justify-center h-full text-dark-500">
              <span className="text-6xl mb-4">🧪</span>
              <p className="text-lg text-dark-300">Configure parameters and run simulation</p>
              <p className="text-sm mt-2">Results will appear here</p>
            </div>
          )}

          {loading && (
            <div className="glass-card p-12 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 border-4 border-agri-500/30 border-t-agri-500 rounded-full animate-spin mb-4" />
              <p className="text-dark-300">Running simulation model...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5 animate-slide-up">
              <div className="grid grid-cols-2 gap-4">
                <KPICard
                  title="Spoilage Reduction"
                  value={`${result.spoilage_reduction_pct.toFixed(1)}`}
                  unit="%"
                  trend="down"
                  trendValue={`From ${result.baseline_spoilage_pct}% to ${result.spoilage_pct}%`}
                  color="green"
                  icon="📉"
                />
                <KPICard
                  title="Value at Risk"
                  value={formatINR(result.value_at_risk)}
                  unit=""
                  trend="down"
                  trendValue={`Saved: ${formatINR(result.value_saved)}`}
                  color="amber"
                  icon="💰"
                />
                <KPICard
                  title="Intervention Cost"
                  value={formatINR(result.intervention_cost)}
                  unit=""
                  trend="neutral"
                  trendValue="Total investment"
                  color="blue"
                  icon="🏗️"
                />
                <KPICard
                  title="Return on Investment"
                  value={`${result.roi.toFixed(1)}`}
                  unit="%"
                  trend={result.roi > 0 ? 'up' : 'down'}
                  trendValue={result.roi > 0 ? 'Profitable' : 'Loss'}
                  color={result.roi > 0 ? 'green' : 'red'}
                  icon="📈"
                />
              </div>

              {/* Breakdown */}
              <div className="glass-card p-6">
                <h4 className="text-sm font-medium text-dark-300 mb-3">Cost Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-dark-400">Cold-chain investment</span>
                    <span className="text-sm text-white font-medium">{formatINR(result.breakdown?.cold_chain_cost ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-dark-400">Transport expansion</span>
                    <span className="text-sm text-white font-medium">{formatINR(result.breakdown?.truck_cost ?? 0)}</span>
                  </div>
                  <div className="border-t border-dark-700/50 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-dark-300 font-medium">Market value (total)</span>
                    <span className="text-sm text-agri-400 font-semibold">{formatINR(result.breakdown?.total_market_value ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
