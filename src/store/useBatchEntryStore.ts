import { create } from 'zustand';
import { apiFetch, createIdempotencyKey } from '@/lib/api';

export interface ContributionEntry {
  memberId: string;
  memberName?: string;
  fundId: string;
  amountInKobo: number;
  type: 'CASH' | 'CHECK' | 'ENVELOPE';
  date?: string;
  notes?: string;
  pledgeId?: string;
}

interface BatchEntryState {
  entries: ContributionEntry[];
  isSubmitting: boolean;
  addEntry: (entry: ContributionEntry) => void;
  removeEntry: (index: number) => void;
  clearBatch: () => void;
  submitBatch: () => Promise<void>;
  getTotalKobo: () => number;
}

// Module-level, so a remount cannot reset the guard mid-flight.
let submitInFlight = false;
let pendingBatchKey: string | null = null;

export const useBatchEntryStore = create<BatchEntryState>((set, get) => ({
  entries: [],
  isSubmitting: false,

  addEntry: (entry) => {
    // The batch payload changed, so the retained key no longer matches it.
    pendingBatchKey = null;
    set((state) => ({ entries: [...state.entries, entry] }));
  },
  removeEntry: (index) => {
    pendingBatchKey = null;
    set((state) => ({ entries: state.entries.filter((_, i) => i !== index) }));
  },
  clearBatch: () => set({ entries: [] }),

  getTotalKobo: () =>
    get().entries.reduce((sum, item) => sum + item.amountInKobo, 0),

  submitBatch: async () => {
    const { entries, clearBatch } = get();
    if (entries.length === 0) return;
    // A ref-based guard, not the `isSubmitting` state: two clicks in the same
    // tick would both read the pre-update state and post the batch twice.
    if (submitInFlight) return;
    submitInFlight = true;
    // Reused across retries of this batch so a replayed request returns the
    // cached response instead of writing a second set of ledger entries.
    const idempotencyKey = pendingBatchKey ?? createIdempotencyKey();
    pendingBatchKey = idempotencyKey;

    set({ isSubmitting: true });
    try {
      await apiFetch('/contributions/batch', {
        method: 'POST',
        body: JSON.stringify({ entries }),
        idempotencyKey,
      });
      pendingBatchKey = null;
      clearBatch();
    } finally {
      submitInFlight = false;
      set({ isSubmitting: false });
    }
  },
}));
