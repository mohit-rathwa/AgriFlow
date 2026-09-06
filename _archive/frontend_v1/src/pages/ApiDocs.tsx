import { Link } from 'react-router-dom'
import { useState } from 'react'

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/analysis/trigger',
    desc: 'Trigger an ML analysis job (Process Mining, Causal ML, or Prediction)',
    tag: 'Analysis',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    body: `{
  "dataset_id": "uuid-of-your-dataset",
  "job_type": "prediction"  
  // Options: "process_mining" | "causal_ml" | "prediction"
}`,
    response: `{
  "job_id": "uuid",
  "status": "queued",
  "job_type": "prediction",
  "created_at": "2026-07-01T10:00:00Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/analysis/{job_id}/status',
    desc: 'Poll the status of a running analysis job (queued → running → complete)',
    tag: 'Analysis',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    body: null,
    response: `{
  "job_id": "uuid",
  "status": "complete",
  "job_type": "prediction",
  "started_at": "2026-07-01T10:00:05Z",
  "completed_at": "2026-07-01T10:00:42Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/analysis/{job_id}/result',
    desc: 'Get the full ML result once job is complete (risk calendar, SHAP values, ATE, etc.)',
    tag: 'Analysis',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    body: null,
    response: `{
  "result": {
    "accuracy": 0.88,
    "roc_auc": 0.92,
    "risk_calendar": [
      { "date": "2026-07-01", "risk_level": "high", "probability": 0.84 }
    ],
    "shap_values": [
      { "feature": "price_lag7", "importance": 0.45 },
      { "feature": "roll_vol_7d", "importance": 0.35 }
    ]
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/simulate',
    desc: 'Run a what-if simulation for cold-chain or transport interventions',
    tag: 'Simulation',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    body: `{
  "commodity": "Onion",
  "season": "kharif",
  "cold_chain_pct": 50,
  "truck_increase_pct": 30
}`,
    response: `{
  "spoilage_pct": 12.5,
  "baseline_spoilage_pct": 25.0,
  "spoilage_reduction_pct": 12.5,
  "value_saved": 1500000,
  "intervention_cost": 500000,
  "roi": 200.0
}`,
  },
  {
    method: 'POST',
    path: '/api/datasets/upload',
    desc: 'Upload a mandi CSV file and run automatic quality checks',
    tag: 'Datasets',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    body: `# multipart/form-data
file: <your-mandi-csv-file>
name: "Maharashtra Onion 2024"`,
    response: `{
  "id": "uuid",
  "name": "Maharashtra Onion 2024",
  "status": "ready",
  "row_count": 45000,
  "quality_report": {
    "total_rows": 45000,
    "missing_timestamps_pct": 0.5,
    "commodities_found": ["Onion"]
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/agent/chat',
    desc: 'Chat with the Intelligence Agent (SSE streaming or sync)',
    tag: 'Agent',
    color: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    body: `{
  "message": "Why did onion prices crash last quarter?",
  "history": []
}`,
    response: `// SSE Stream (text/event-stream)
event: token
data: {"content": "Based on the mandi data..."}

event: tool_call
data: {"tool": "run_process_mining_tool", "args": {...}}

event: done
data: {"content": "Full response here"}`,
  },
]

const CODE_EXAMPLES = {
  python: `import requests

BASE_URL = "https://agriflow-api-f97e.onrender.com"
API_KEY  = "your_api_key_here"
HEADERS  = {"Authorization": f"Bearer {API_KEY}"}

# 1. Upload dataset
with open("mandi_data.csv", "rb") as f:
    upload = requests.post(
        f"{BASE_URL}/api/datasets/upload",
        files={"file": f},
        data={"name": "Onion 2024"},
        headers=HEADERS
    )
dataset_id = upload.json()["id"]

# 2. Trigger prediction
job = requests.post(
    f"{BASE_URL}/api/analysis/trigger",
    json={"dataset_id": dataset_id, "job_type": "prediction"},
    headers=HEADERS
).json()

# 3. Poll until complete
import time
while True:
    status = requests.get(
        f"{BASE_URL}/api/analysis/{job['job_id']}/status",
        headers=HEADERS
    ).json()
    if status["status"] == "complete":
        break
    time.sleep(3)

# 4. Get results
result = requests.get(
    f"{BASE_URL}/api/analysis/{job['job_id']}/result",
    headers=HEADERS
).json()
print(result["result"]["risk_calendar"])`,

  javascript: `const BASE_URL = "https://agriflow-api-f97e.onrender.com";
const API_KEY  = "your_api_key_here";
const headers  = { "Authorization": \`Bearer \${API_KEY}\`, "Content-Type": "application/json" };

// 1. Trigger price prediction
const job = await fetch(\`\${BASE_URL}/api/analysis/trigger\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    dataset_id: "your-dataset-id",
    job_type: "prediction"
  })
}).then(r => r.json());

// 2. Poll for completion
const poll = async (jobId) => {
  const status = await fetch(\`\${BASE_URL}/api/analysis/\${jobId}/status\`, { headers })
    .then(r => r.json());
  if (status.status === "complete") return jobId;
  await new Promise(r => setTimeout(r, 3000));
  return poll(jobId);
};
await poll(job.job_id);

// 3. Get risk calendar
const result = await fetch(\`\${BASE_URL}/api/analysis/\${job.job_id}/result\`, { headers })
  .then(r => r.json());
console.log(result.result.risk_calendar);`,

  curl: `# Trigger a price prediction job
curl -X POST https://agriflow-api-f97e.onrender.com/api/analysis/trigger \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"dataset_id":"your-id","job_type":"prediction"}'

# Check job status
curl https://agriflow-api-f97e.onrender.com/api/analysis/JOB_ID/status \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Run what-if simulation
curl -X POST https://agriflow-api-f97e.onrender.com/api/simulate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"commodity":"Onion","season":"kharif","cold_chain_pct":50}'`,
}

export default function ApiDocs() {
  const [activeTab, setActiveTab] = useState<'python' | 'javascript' | 'curl'>('python')
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-dark-800/60 bg-dark-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-agri-500 to-emerald-600 flex items-center justify-center text-lg">🌾</div>
            <span className="text-lg font-bold">Agri<span className="text-agri-400">Flow</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="https://agriflow-api-f97e.onrender.com/docs" target="_blank" rel="noreferrer" className="btn-secondary text-sm py-2 px-4">
              Interactive Swagger UI ↗
            </a>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">Get API Key</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
            🔌 REST API
          </div>
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-dark-400 text-lg max-w-2xl">
            Embed AgriFlow's ML predictions directly into your agricultural app. 
            Full REST API with OpenAPI spec and streaming support.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/60 text-sm">
              <span className="text-dark-500">Base URL:</span>
              <code className="text-agri-400">https://agriflow-api-f97e.onrender.com</code>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/60 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-sm">API Online</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Endpoints */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Endpoints</h2>
            {ENDPOINTS.map((ep) => (
              <div key={ep.path} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedEndpoint(expandedEndpoint === ep.path ? null : ep.path)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-dark-700/20 transition-colors text-left"
                >
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${
                    ep.method === 'POST' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                  }`}>{ep.method}</span>
                  <code className="text-sm text-dark-200 font-mono flex-1">{ep.path}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ep.color}`}>{ep.tag}</span>
                  <svg className={`w-4 h-4 text-dark-500 transition-transform ${expandedEndpoint === ep.path ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {expandedEndpoint === ep.path && (
                  <div className="border-t border-dark-700/50 p-5 space-y-4">
                    <p className="text-sm text-dark-300">{ep.desc}</p>
                    {ep.body && (
                      <div>
                        <p className="text-xs text-dark-500 font-medium mb-2">REQUEST BODY</p>
                        <pre className="bg-dark-900/80 rounded-xl p-4 text-xs text-dark-200 font-mono overflow-x-auto">{ep.body}</pre>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-dark-500 font-medium mb-2">RESPONSE</p>
                      <pre className="bg-dark-900/80 rounded-xl p-4 text-xs text-emerald-400/80 font-mono overflow-x-auto">{ep.response}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar: Code Examples + Rate Limits */}
          <div className="space-y-5">
            {/* Code */}
            <div className="glass-card overflow-hidden sticky top-24">
              <div className="flex border-b border-dark-700/50">
                {(['python', 'javascript', 'curl'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-xs font-medium transition-colors ${activeTab === tab ? 'text-agri-400 border-b-2 border-agri-400 bg-agri-500/5' : 'text-dark-500 hover:text-dark-300'}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <pre className="p-4 text-xs text-dark-300 font-mono overflow-x-auto leading-relaxed max-h-96">
                {CODE_EXAMPLES[activeTab]}
              </pre>
            </div>

            {/* Rate Limits */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-4">Rate Limits by Plan</h3>
              <div className="space-y-3">
                {[
                  { plan: 'Free', calls: '100 calls/day', color: 'text-dark-400' },
                  { plan: 'Pro', calls: '5,000 calls/day', color: 'text-agri-400' },
                  { plan: 'Enterprise', calls: 'Unlimited + SLA', color: 'text-purple-400' },
                ].map((r) => (
                  <div key={r.plan} className="flex justify-between text-sm">
                    <span className="text-dark-400">{r.plan}</span>
                    <span className={`font-medium ${r.color}`}>{r.calls}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-dark-700/50">
                <Link to="/login" className="btn-primary w-full text-center text-sm block">
                  Generate API Key
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
