'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { LedgerTable } from '@/components/modules/ledger/LedgerTable';
import { apiFetch } from '@/lib/api';
import { useIdempotentSubmit } from '@/hooks/useIdempotentSubmit';

interface LedgerEntry {
  id: string;
  fundId: string;
  fund?: { id: string; name: string } | null;
  type: 'DONATION' | 'EXPENSE' | 'TRANSFER' | 'REVERSAL';
  amountInKobo: number;
  description: string;
  recordedById: string;
  reversedById?: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A reversal writes a reversing ledger row, so it is replay-protected and
  // cannot be fired twice from a double-click.
  const reverseEntry = useIdempotentSubmit(
    useCallback(async (key: string, id: string) => {
      await apiFetch(`/ledger/${id}/reverse`, {
        method: 'PATCH',
        body: JSON.stringify({ reversalReason: 'Reversed from UI' }),
        idempotencyKey: key,
      });
    }, [])
  );

  const loadLedger = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<PaginatedResponse<LedgerEntry>>('/ledger?page=1&pageSize=100');
      setEntries(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ledger');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const handleReverse = async (id: string) => {
    setError(null);
    try {
      await reverseEntry.run(id);
      loadLedger();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse entry');
    }
  };

  return (
    <div className="space-y-6">
      <Header title="General Ledger" />
      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading ledger...</div>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {!loading && !error && (
        <LedgerTable entries={entries} onReverse={handleReverse} busy={reverseEntry.pending} />
      )}
    </div>
  );
}
