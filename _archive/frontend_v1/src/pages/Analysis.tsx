import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDatasets } from '../hooks/useDataset'
import { useTriggerJob, useJobStatus, useJobResult } from '../hooks/useJob'
import JobStatusBadge from '../components/ui/JobStatusBadge'
import ParetoChart from '../components/charts/ParetoChart'
import ATEBarChart from '../components/charts/ATEBarChart'
import RiskCalendar from '../components/charts/RiskCalendar'
import ShapWaterfall from '../components/charts/ShapWaterfall'

type Tab = 'process_mining' | 'causal_ml' | 'prediction'

export default function Analysis() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('process_mining')
  const [selectedDataset, setSelectedDataset] = useState(searchParams.get('dataset') || '')
  const [jobIds, setJobIds] = useState<Record<Tab, string | null>>({
    process_mining: null,
    causal_ml: null,
    prediction: null,
  })

  const { data: datasets } = useDatasets()
  const triggerMutation = useTriggerJob()

  // Job status polling for active tab
  const activeJobId = jobIds[activeTab]
  const { data: jobStatus } = useJobStatus(activeJobId)
  const { data: jobResult } = useJobResult(
    jobStatus?.status === 'complete' ? activeJobId : null
  )

  const handleTrigger = async (jobType: Tab) => {
    if (!selectedDataset) return
    try {
      const result = await triggerMutation.mutateAsync({
        dataset_id: selectedDataset,
        job_type: jobType,
      })
      setJobIds((prev) => ({ ...prev, [jobType]: result.job_id }))
    } catch (err) {
      console.error('Failed to trigger job:', err)
    }
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'process_mining', label: 'Process Mining', icon: '⚙️' },
    { key: 'causal_ml', label: 'Causal ML', icon: '🔬' },
    { key: 'prediction', label: 'Prediction', icon: '🔮' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Analysis</h1>
        <p className="mt-1 text-dark-400">Run ML analysis jobs on your datasets</p>
      </div>

      {/* Dataset Selector */}
      <div className="glass-card p-4">
        <label className="block text-sm text-dark-400 mb-2">Select Dataset</label>
        <select
          className="input-field max-w-md"
          value={selectedDataset}
          onChange={(e) => setSelectedDataset(e.target.value)}
        >
          <option value="">Choose a dataset...</option>
          {datasets?.map((ds: any) => (
            <option key={ds.id} value={ds.id}>
              {ds.name} — {ds.row_count?.toLocaleString() ?? '?'} rows
            </option>
          ))}
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-dark-800/60 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === tab.key
                ? 'bg-dark-700 text-white shadow-lg'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/40'}`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analysis Panel */}
      <div className="glass-card p-6 min-h-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h3>
            {activeJobId && jobStatus && (
              <JobStatusBadge status={jobStatus.status} />
            )}
          </div>
          <button
            onClick={() => handleTrigger(activeTab)}
            disabled={!selectedDataset || triggerMutation.isPending}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggerMutation.isPending ? 'Triggering...' : '▶ Run Analysis'}
          </button>
        </div>

        {/* Results */}
        {!activeJobId && (
          <div className="flex flex-col items-center justify-center h-64 text-dark-500">
            <span className="text-5xl mb-4">📊</span>
            <p className="text-lg">Select a dataset and run analysis to see results</p>
          </div>
        )}

        {activeJobId && jobStatus?.status === 'running' && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-agri-500/30 border-t-agri-500 rounded-full animate-spin mb-4" />
            <p className="text-dark-300">Analysis in progress...</p>
            <p className="text-sm text-dark-500 mt-1">This may take a few minutes</p>
          </div>
        )}

        {activeJobId && jobStatus?.status === 'failed' && (
          <div className="flex flex-col items-center justify-center h-64 text-red-400">
            <span className="text-5xl mb-4">❌</span>
            <p className="text-lg">Analysis failed</p>
            <p className="text-sm text-dark-500 mt-2">{jobStatus.error_message}</p>
          </div>
        )}

        {jobResult && jobStatus?.status === 'complete' && (
          <div className="space-y-6">
            {activeTab === 'process_mining' && jobResult.result && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">Top Bottleneck</p>
                    <p className="text-xl font-bold text-white capitalize mt-1">
                      {jobResult.result.top_bottleneck?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">Top 2 Stages Explain</p>
                    <p className="text-xl font-bold text-agri-400 mt-1">
                      {jobResult.result.pct_explained}%
                    </p>
                  </div>
                </div>
                <ParetoChart data={jobResult.result.pareto_data ?? []} />
              </>
            )}

            {activeTab === 'causal_ml' && jobResult.result && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">Overall ATE</p>
                    <p className="text-xl font-bold text-white mt-1">
                      ₹{jobResult.result.overall_ate?.ate}
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">Placebo ATE</p>
                    <p className="text-xl font-bold text-dark-300 mt-1">
                      ₹{jobResult.result.placebo_ate}
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">OLS Biased?</p>
                    <p className={`text-xl font-bold mt-1 ${jobResult.result.is_ols_biased ? 'text-red-400' : 'text-emerald-400'}`}>
                      {jobResult.result.is_ols_biased ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                <ATEBarChart data={
                  Object.entries(jobResult.result.ate_by_commodity ?? {}).map(([key, val]: [string, any]) => ({
                    commodity: key,
                    ate: val.ate,
                    ci_low: val.ate_lower,
                    ci_high: val.ate_upper,
                  }))
                } />
              </>
            )}

            {activeTab === 'prediction' && jobResult.result && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">Accuracy</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {(jobResult.result.accuracy * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">ROC-AUC</p>
                    <p className="text-xl font-bold text-agri-400 mt-1">
                      {jobResult.result.roc_auc?.toFixed(3)}
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400">Sample Size</p>
                    <p className="text-xl font-bold text-dark-200 mt-1">
                      {jobResult.result.sample_size?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-3">SHAP Feature Importance</h4>
                    <ShapWaterfall data={jobResult.result.shap_values ?? []} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-3">Risk Calendar</h4>
                    <RiskCalendar data={jobResult.result.risk_calendar ?? []} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
