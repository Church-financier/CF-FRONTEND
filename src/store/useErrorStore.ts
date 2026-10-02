import { create } from 'zustand';

interface ErrorState {
  error: string | null;
  setError: (message: string) => void;
  clearError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  error: null,
  setError: (message) => set({ error: message }),
  clearError: () => set({ error: null }),
}));
