import { create } from 'zustand';
import type { User } from '../types';

interface AppState {
  user: User | null;
  activeDatasetId: string | null;
  sidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setActiveDatasetId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  activeDatasetId: null,
  sidebarOpen: true,

  setUser: (user) => set({ user }),

  setActiveDatasetId: (id) => set({ activeDatasetId: id }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  logout: () => {
    localStorage.removeItem('demoMode');
    set({ user: null, activeDatasetId: null });
    window.location.href = '/login';
  },
}));
