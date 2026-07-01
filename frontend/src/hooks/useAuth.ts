import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useStore } from '../store/useStore';
import type { User } from '../types';

export function useAuth() {
  const { user, setUser } = useStore();
  const isDemoMode = localStorage.getItem('demoMode') === 'true';

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
    // Don't fire the query if user is already in store OR we're in demo mode
    enabled: !user && !isDemoMode,
  });

  return {
    user: user || query.data || null,
    isLoading: !user && !isDemoMode && query.isLoading,
    isAuthenticated: !!user || isDemoMode || !!query.data,
    isError: !isDemoMode && query.isError,
    refetch: query.refetch,
  };
}
