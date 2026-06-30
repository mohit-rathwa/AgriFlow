import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Job, JobType } from '../types';

export function useJobStatus(jobId: string | null) {
  return useQuery<Job>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data } = await api.get<Job>(`/analysis/${jobId}/status`);
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'complete' || status === 'failed') {
        return false;
      }
      return 3000;
    },
  });
}

export function useTriggerJob() {
  const queryClient = useQueryClient();

  return useMutation<Job, Error, { dataset_id: string; job_type: JobType }>({
    mutationFn: async (params) => {
      const { data } = await api.post<Job>('/analysis/trigger', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useJobResult(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId, 'result'],
    queryFn: async () => {
      const { data } = await api.get(`/analysis/${jobId}/result`);
      return data;
    },
    enabled: !!jobId,
  });
}

export function useSimulation() {
  return useMutation({
    mutationFn: async (params: {
      dataset_id: string;
      cold_chain_pct: number;
      season: string;
      commodity: string;
      truck_capacity_pct: number;
    }) => {
      const { data } = await api.post('/simulate', params);
      return data;
    },
  });
}
