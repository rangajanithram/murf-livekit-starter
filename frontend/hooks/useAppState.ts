import { create } from 'zustand';

interface AppState {
  activeTab: 'home' | 'teacher' | 'analytics';
  setActiveTab: (tab: 'home' | 'teacher' | 'analytics') => void;
}

export const useAppState = create<AppState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
