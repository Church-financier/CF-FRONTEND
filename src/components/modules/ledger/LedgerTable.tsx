'use client';

import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useFilterStore } from '@/store/useFilterStore';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type EntryType = 'DONATION' | 'EXPENSE' | 'TRANSFER' | 'REVERSAL' | '';

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

interface LedgerTableProps {
  entries: LedgerEntry[];
  onReverse: (id: string) => void;
  /** A reversal is in flight; the action is disabled until it settles. */
  busy?: boolean;
}

export function LedgerTable({ entries, onReverse, busy = false }: LedgerTableProps) {
  const { format, code } = useCurrency();
  const { fundId, startDate, endDate, entryType, setDateRange, setEntryType } = useFilterStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (fundId && entry.fundId !== fundId) return false;
      if (startDate && new Date(entry.createdAt).toISOString().split('T')[0] < startDate)
        return false;
      if (endDate && new Date(entry.createdAt).toISOString().split('T')[0] > endDate)
        return false;
      if (entryType && entry.type !== entryType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.description.toLowerCase().includes(query) ||
          entry.fundId.toLowerCase().includes(query) ||
          (entry.fund?.name?.toLowerCase() || '').includes(query)
        );
      }
      return true;
    });
  }, [entries, fundId, startDate, endDate, entryType, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-wrap sm:flex-row sm:items-center">
        <Input
          placeholder="Search ledger entries..."
          aria-label="Search ledger entries"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-sm sm:min-w-[200px] sm:flex-1"
        />
        <Input
          type="date"
          aria-label="Start date"
          value={startDate || ''}
          onChange={(e) => setDateRange(e.target.value || null, endDate)}
          className="w-full sm:w-auto"
        />
        <Input
          type="date"
          aria-label="End date"
          value={endDate || ''}
          onChange={(e) => setDateRange(startDate, e.target.value || null)}
          className="w-full sm:w-auto"
        />
        <select
          aria-label="Filter by entry type"
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as EntryType)}
          className="w-full rounded-md border border-navy-200 bg-white px-3 py-1 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-500 sm:w-auto"
        >
          <option value="">All Types</option>
          <option value="DONATION">Donation</option>
          <option value="EXPENSE">Expense</option>
          <option value="TRANSFER">Transfer</option>
          <option value="REVERSAL">Reversal</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-navy-50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount ({code})</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-navy-500">
                  No ledger entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-navy-900">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-navy-600">{entry.fund?.name || entry.fundId || 'N/A'}</TableCell>
                  <TableCell className="text-sm text-navy-900">{entry.description}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.type === 'DONATION' || entry.type === 'TRANSFER'
                          ? 'bg-green-100 text-green-800'
                          : entry.type === 'EXPENSE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {entry.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-navy-900">
                    {format(entry.amountInKobo)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PermissionGuard permission="ledger:reverse" fallback={null}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReverse(entry.id)}
                        disabled={busy || entry.type === 'REVERSAL' || Boolean(entry.reversedById)}
                      >
                        Reverse
                      </Button>
                    </PermissionGuard>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
