export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: 'google' | 'github';
  role: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  commodity?: string;
  status: 'processing' | 'ready' | 'error';
  row_count?: number;
  date_from?: string;
  date_to?: string;
  storage_path?: string;
  quality_report?: QualityReport;
  created_at: string;
}

export interface QualityReport {
  total_rows: number;
  date_range: { from: string | null; to: string | null };
  commodities_found: string[];
  missing_timestamps_pct: number;
  price_outliers: Array<{ row: number; value: number; commodity: string }>;
  encoding_issues: Array<{ column: string; sample: string }>;
  msp_year_encoding_bug: boolean;
}

export type JobStatus = 'queued' | 'running' | 'complete' | 'failed';
export type JobType = 'process_mining' | 'causal_ml' | 'prediction';

export interface Job {
  id: string;
  job_id?: string;
  dataset_id: string;
  job_type: JobType;
  status: JobStatus;
  result?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ParetoItem {
  stage: string;
  delay_hours: number;
  pct_contribution: number;
  cumulative_pct: number;
}

export interface ATEItem {
  commodity: string;
  ate: number;
  ci_low: number;
  ci_high: number;
}

export interface RiskDay {
  date: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_probability: number;
}

export interface ShapFeature {
  feature: string;
  importance: number;
}

export interface SimulationParams {
  dataset_id?: string;
  cold_chain_pct: number;
  season: 'kharif' | 'rabi' | 'zaid';
  commodity: string;
  truck_increase_pct: number;
}

export interface SimulationResult {
  spoilage_pct: number;
  baseline_spoilage_pct: number;
  spoilage_reduction_pct: number;
  value_at_risk: number;
  value_saved: number;
  intervention_cost: number;
  roi: number;
  breakdown: Record<string, number>;
}
