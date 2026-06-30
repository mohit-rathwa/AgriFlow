import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface Report {
  id: string;
  title: string;
  commodity?: string;
  type: string;
  content: string;
  created_at: string;
}

export function useReports() {
  return useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data } = await api.get<Report[]>('/reports');
      return data;
    },
  });
}
