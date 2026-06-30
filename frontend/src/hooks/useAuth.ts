import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useStore } from '../store/useStore';
import type { User } from '../types';

export function useAuth() {
  const { user, setUser } = useStore();

  const query = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !user,
  });

  return {
    user: user || query.data || null,
    isLoading: !user && query.isLoading,
    isAuthenticated: !!user || !!query.data,
    isError: query.isError,
    refetch: query.refetch,
  };
}
