import { useState } from 'react'
import { useDatasets } from '../hooks/useDataset'
import DataQualityFlag from '../components/ui/DataQualityFlag'
import JobStatusBadge from '../components/ui/JobStatusBadge'

export default function DataQuality() {
  const { data: datasets, isLoading } = useDatasets()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Data Quality Monitor</h1>
        <p className="mt-1 text-dark-400">Review data quality across all uploaded datasets</p>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-agri-500/30 border-t-agri-500 rounded-full animate-spin" />
          </div>
        ) : !datasets?.length ? (
          <div className="p-12 text-center text-dark-500">
            <span className="text-5xl block mb-4">📭</span>
            <p className="text-lg">No datasets uploaded yet</p>
            <p className="text-sm mt-1">Upload a CSV to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-dark-700/50">
                <th className="px-6 py-3.5 font-medium">Dataset</th>
                <th className="px-6 py-3.5 font-medium">Status</th>
                <th className="px-6 py-3.5 font-medium">Rows</th>
                <th className="px-6 py-3.5 font-medium">Date Range</th>
                <th className="px-6 py-3.5 font-medium">Issues</th>
                <th className="px-6 py-3.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/30">
              {datasets.map((ds: any) => {
                const qr = ds.quality_report
                const hasIssues = qr && (
                  qr.encoding_issues?.length > 0 ||
                  qr.missing_timestamps_pct > 5 ||
                  qr.price_outliers?.length > 0 ||
                  qr.msp_year_encoding_bug
                )

                return (
                  <tr key={ds.id} className="group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-dark-200">{ds.name}</p>
                      <p className="text-xs text-dark-500 mt-0.5">{ds.commodity ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <JobStatusBadge
                        status={ds.status === 'ready' ? 'complete' : ds.status === 'error' ? 'failed' : 'running'}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-300">
                      {ds.row_count?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-400">
                      {ds.date_from && ds.date_to
                        ? `${ds.date_from} → ${ds.date_to}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {qr?.encoding_issues?.length > 0 && (
                          <DataQualityFlag type="encoding" count={qr.encoding_issues.length} />
                        )}
                        {qr?.missing_timestamps_pct > 5 && (
                          <DataQualityFlag type="missing" count={Math.round(qr.missing_timestamps_pct)} />
                        )}
                        {qr?.price_outliers?.length > 0 && (
                          <DataQualityFlag type="outlier" count={qr.price_outliers.length} />
                        )}
                        {qr?.msp_year_encoding_bug && (
                          <DataQualityFlag type="msp_bug" count={1} />
                        )}
                        {!hasIssues && qr && (
                          <span className="badge-success text-xs">✓ Clean</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {qr && (
                        <button
                          onClick={() => toggleExpand(ds.id)}
                          className="text-xs text-dark-400 hover:text-agri-400 transition-colors"
                        >
                          {expandedId === ds.id ? '▲ Hide' : '▼ Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expanded Quality Report */}
      {expandedId && datasets?.find((ds: any) => ds.id === expandedId)?.quality_report && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-white mb-4">
            Quality Report — {datasets.find((ds: any) => ds.id === expandedId)?.name}
          </h3>

          {(() => {
            const qr = datasets.find((ds: any) => ds.id === expandedId)?.quality_report
            if (!qr) return null
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-xs text-dark-500 uppercase tracking-wide">Total Rows</p>
                    <p className="text-xl font-bold text-white mt-1">{qr.total_rows?.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-xs text-dark-500 uppercase tracking-wide">Missing Dates</p>
                    <p className={`text-xl font-bold mt-1 ${qr.missing_timestamps_pct > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {qr.missing_timestamps_pct}%
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-xs text-dark-500 uppercase tracking-wide">Price Outliers</p>
                    <p className={`text-xl font-bold mt-1 ${qr.price_outliers?.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {qr.price_outliers?.length ?? 0}
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-4">
                    <p className="text-xs text-dark-500 uppercase tracking-wide">Commodities</p>
                    <p className="text-sm font-medium text-white mt-1">{qr.commodities_found?.join(', ')}</p>
                  </div>
                </div>

                {qr.price_outliers?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Price Outliers (top 10)</h4>
                    <div className="bg-dark-900/30 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-dark-500 border-b border-dark-700/30">
                            <th className="px-4 py-2 text-left">Row</th>
                            <th className="px-4 py-2 text-left">Commodity</th>
                            <th className="px-4 py-2 text-right">Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qr.price_outliers.slice(0, 10).map((o: any, i: number) => (
                            <tr key={i} className="border-b border-dark-800/50">
                              <td className="px-4 py-2 text-dark-400">{o.row}</td>
                              <td className="px-4 py-2 text-dark-300">{o.commodity}</td>
                              <td className="px-4 py-2 text-right text-red-400 font-mono">₹{o.value?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Raw JSON (collapsible) */}
                <details className="group">
                  <summary className="text-xs text-dark-500 cursor-pointer hover:text-dark-400">
                    View raw quality report JSON
                  </summary>
                  <pre className="mt-2 p-4 bg-dark-900/50 rounded-lg text-xs text-dark-400 overflow-x-auto">
                    {JSON.stringify(qr, null, 2)}
                  </pre>
                </details>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
