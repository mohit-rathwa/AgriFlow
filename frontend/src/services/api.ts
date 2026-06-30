import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- DEMO MODE MOCKING ---
const isDemoMode = () => localStorage.getItem('demoMode') === 'true';

const mockData: Record<string, any> = {
  '/auth/me': {
    id: 'demo-123',
    name: 'Demo User',
    email: 'demo@agriflow.com',
    role: 'admin',
    provider: 'demo',
  },
  '/datasets': [
    {
      id: 'demo-ds-1',
      name: 'Maharashtra Onion Data 2018-2024',
      commodity: 'Onion',
      row_count: 3200000,
      status: 'ready',
      created_at: new Date().toISOString(),
      quality_report: { missing_timestamps_pct: 0, price_outliers: 120, total_rows: 3200000 }
    }
  ],
  '/reports': [
    {
      id: 'demo-rep-1',
      title: 'AgriFlow Brief — Onion Supply Chain Bottleneck Analysis — 30 June 2026',
      commodity: 'Onion',
      job_type: 'process_mining',
      content: '# Executive Summary\n\n- The top bottleneck is **transport**, contributing to 45% of total delays.\n- Process delays correlate heavily with price crashes in local mandis.\n\n## Recommendations\n- Increase cold-storage capabilities at the farm gate.',
      created_at: new Date().toISOString(),
    }
  ],
  '/simulate': {
    spoilage_pct: 12.5,
    baseline_spoilage_pct: 25.0,
    spoilage_reduction_pct: 12.5,
    value_at_risk: 1500000,
    value_saved: 1500000,
    intervention_cost: 500000,
    roi: 200.0,
    breakdown: { season_multiplier: 1.3, avg_price_per_quintal: 2500 }
  }
};

const originalGet = api.get;
api.get = async function (url: string, config?: any) {
  if (isDemoMode()) {
    // Exact match
    if (mockData[url]) return { data: mockData[url] } as any;
    // Dataset detail
    if (url.startsWith('/datasets/')) return { data: mockData['/datasets'][0] } as any;
    // Analysis Status (always complete)
    if (url.includes('/status')) return { data: { status: 'complete', job_type: 'process_mining' } } as any;
    // Analysis Result
    if (url.includes('/result')) {
      return {
        data: {
          result: {
            top_bottleneck: 'transport',
            pct_explained: 65,
            pareto_data: [
              { stage: 'transport', delay_hours: 48, pct_contribution: 45, cumulative_pct: 45 },
              { stage: 'market_arrival', delay_hours: 24, pct_contribution: 20, cumulative_pct: 65 },
              { stage: 'auction', delay_hours: 12, pct_contribution: 15, cumulative_pct: 80 }
            ],
            overall_ate: { ate: 450.5 },
            placebo_ate: 12.0,
            is_ols_biased: true,
            ate_by_commodity: { 'Onion': { ate: 450, ate_lower: 400, ate_upper: 500 } },
            accuracy: 0.88,
            roc_auc: 0.92,
            sample_size: 50000,
            shap_values: [{ feature: 'price_lag7', importance: 0.45 }, { feature: 'roll_vol_7d', importance: 0.35 }],
            risk_calendar: [{ date: '2026-07-01', risk_level: 'high', risk_probability: 0.8 }]
          }
        }
      } as any;
    }
  }
  return originalGet.apply(api, [url, config] as any);
} as any;

const originalPost = api.post;
api.post = async function (url: string, data?: any, config?: any) {
  if (isDemoMode()) {
    if (url.includes('/trigger')) return { data: { job_id: 'demo-job', status: 'queued' } } as any;
    if (url.includes('/simulate')) return { data: mockData['/simulate'] } as any;
  }
  return originalPost.apply(api, [url, data, config] as any);
} as any;

const originalDelete = api.delete;
api.delete = async function (url: string, config?: any) {
  if (isDemoMode()) return { data: { success: true } } as any;
  return originalDelete.apply(api, [url, config] as any);
} as any;
// ----------------------------

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isDemoMode()) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
