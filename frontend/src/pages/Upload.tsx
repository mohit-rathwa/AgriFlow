import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUploadDataset } from '../hooks/useDataset'
import DataQualityFlag from '../components/ui/DataQualityFlag'

export default function Upload() {
  const navigate = useNavigate()
  const uploadMutation = useUploadDataset()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [qualityReport, setQualityReport] = useState<any>(null)
  const [datasetId, setDatasetId] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.csv')) setFile(f)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name.replace('.csv', ''))

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + Math.random() * 15, 90))
    }, 300)

    try {
      const result = await uploadMutation.mutateAsync(formData)
      clearInterval(interval)
      setUploadProgress(100)
      setQualityReport(result.quality_report)
      setDatasetId(result.id)
    } catch (err) {
      clearInterval(interval)
      setUploadProgress(0)
    }
  }

  const triggerAnalysis = () => {
    if (datasetId) navigate(`/analysis?dataset=${datasetId}`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Dataset</h1>
        <p className="mt-1 text-dark-400">Upload mandi CSV data for analysis</p>
      </div>

      {/* Upload Zone */}
      {!qualityReport && (
        <div
          className={`glass-card p-12 text-center border-2 border-dashed transition-all duration-300 cursor-pointer
            ${dragActive ? 'border-agri-400 bg-agri-500/5' : 'border-dark-600/50 hover:border-dark-500/70'}
            ${file ? 'border-agri-500/50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!file ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-700/60 flex items-center justify-center">
                <span className="text-3xl">📂</span>
              </div>
              <p className="text-lg text-dark-200 font-medium">
                Drag & drop your CSV file here
              </p>
              <p className="mt-2 text-sm text-dark-400">
                or click to browse · CSV files up to 100MB
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-agri-500/10 flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-lg text-dark-200 font-medium">{file.name}</p>
              <p className="mt-1 text-sm text-dark-400">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {file && !qualityReport && (
        <div className="glass-card p-6 space-y-4">
          {uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-dark-300">Uploading & analyzing...</span>
                <span className="text-agri-400 font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-agri-600 to-agri-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending || uploadProgress > 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? 'Processing...' : 'Upload & Analyze'}
          </button>
        </div>
      )}

      {/* Quality Report */}
      {qualityReport && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Data Quality Report
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-dark-900/50 rounded-xl p-4">
                <p className="text-sm text-dark-400">Total Rows</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {qualityReport.total_rows?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-4">
                <p className="text-sm text-dark-400">Date Range</p>
                <p className="text-sm font-medium text-white mt-1">
                  {qualityReport.date_range?.from ?? '—'} → {qualityReport.date_range?.to ?? '—'}
                </p>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-4">
                <p className="text-sm text-dark-400">Commodities</p>
                <p className="text-sm font-medium text-white mt-1">
                  {qualityReport.commodities_found?.join(', ') ?? '—'}
                </p>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-4">
                <p className="text-sm text-dark-400">Missing Dates</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {qualityReport.missing_timestamps_pct ?? 0}%
                </p>
              </div>
            </div>

            {/* Quality Flags */}
            <div className="flex flex-wrap gap-3">
              {qualityReport.encoding_issues?.length > 0 && (
                <DataQualityFlag type="encoding" count={qualityReport.encoding_issues.length} />
              )}
              {qualityReport.missing_timestamps_pct > 5 && (
                <DataQualityFlag type="missing" count={Math.round(qualityReport.missing_timestamps_pct)} />
              )}
              {qualityReport.price_outliers?.length > 0 && (
                <DataQualityFlag type="outlier" count={qualityReport.price_outliers.length} />
              )}
              {qualityReport.msp_year_encoding_bug && (
                <DataQualityFlag type="msp_bug" count={1} />
              )}
              {!qualityReport.encoding_issues?.length &&
               qualityReport.missing_timestamps_pct <= 5 &&
               !qualityReport.price_outliers?.length &&
               !qualityReport.msp_year_encoding_bug && (
                <span className="badge-success text-sm">✓ All quality checks passed</span>
              )}
            </div>
          </div>

          <button onClick={triggerAnalysis} className="btn-primary w-full text-lg py-3">
            🚀 Run Analysis on this Dataset
          </button>
        </div>
      )}
    </div>
  )
}
