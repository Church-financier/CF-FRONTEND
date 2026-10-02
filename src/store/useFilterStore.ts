import { create } from 'zustand';

type EntryType = 'DONATION' | 'EXPENSE' | 'TRANSFER' | 'REVERSAL' | '';

interface FilterState {
  fundId: string | null;
  startDate: string | null;
  endDate: string | null;
  entryType: EntryType;
  setFundId: (fundId: string | null) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  setEntryType: (entryType: EntryType) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  fundId: null,
  startDate: null,
  endDate: null,
  entryType: '',
  setFundId: (fundId) => set({ fundId }),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  setEntryType: (entryType) => set({ entryType }),
  resetFilters: () => set({ fundId: null, startDate: null, endDate: null, entryType: '' }),
}));
