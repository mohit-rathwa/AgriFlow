import { useState } from 'react';
import { useReports, type Report } from '../hooks/useReports';

const typeBadge: Record<string, string> = {
  analysis: 'badge-info',
  prediction: 'badge-warning',
  simulation: 'badge-success',
  causal: 'badge-success',
  process_mining: 'badge-info',
  default: 'badge-queued',
};

function ReportCard({ report, isExpanded, onToggle }: { report: Report; isExpanded: boolean; onToggle: () => void }) {
  const badgeClass = typeBadge[report.type] || typeBadge.default;
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="glass-card overflow-hidden transition-all duration-300 hover:border-dark-600/50">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-start gap-4 p-5 text-left group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-agri-500/20 to-agri-700/10 border border-agri-500/20 flex items-center justify-center text-lg flex-shrink-0">
          📄
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-agri-400 transition-colors truncate">
            {report.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            {report.commodity && (
              <span className="text-xs text-dark-400">
                <span className="text-dark-600">Commodity:</span> {report.commodity}
              </span>
            )}
            <span className="text-xs text-dark-500">{date}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={badgeClass}>{report.type.replace('_', ' ')}</span>
          <svg
            className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-dark-700/50 p-5">
          {/* Markdown-ish content */}
          <div className="prose-dark text-sm text-dark-200 leading-relaxed whitespace-pre-wrap font-mono bg-dark-900/40 rounded-xl p-4 max-h-96 overflow-y-auto">
            {report.content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700/30">
            <button className="btn-secondary text-xs flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button className="btn-secondary text-xs flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-dark-800/60 border border-dark-700/50 flex items-center justify-center text-4xl">
          📋
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg bg-dark-800/80 border border-dark-700/50 flex items-center justify-center text-sm">
          ✨
        </div>
        <div className="absolute inset-0 rounded-2xl bg-dark-500/10 blur-2xl -z-10" />
      </div>
      <h3 className="text-lg font-semibold text-dark-200 mb-2">No Reports Yet</h3>
      <p className="text-sm text-dark-500 max-w-sm leading-relaxed">
        Reports will appear here once the Intelligence Agent generates analyses,
        predictions, or simulation results.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-dark-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-dark-700/50 rounded w-2/3" />
              <div className="h-3 bg-dark-700/30 rounded w-1/3" />
            </div>
            <div className="h-5 w-16 bg-dark-700/30 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { data: reports, isLoading, error } = useReports();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleReport = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-dark-400">Generated analysis and insight reports</p>
        </div>
        {reports && reports.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-500">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-dark-300 text-sm">Failed to load reports</p>
          <p className="text-dark-500 text-xs mt-1">{(error as Error).message}</p>
        </div>
      ) : !reports || reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isExpanded={expandedId === report.id}
              onToggle={() => toggleReport(report.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
