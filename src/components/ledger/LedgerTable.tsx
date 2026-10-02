'use client';

import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useFilterStore } from '@/store/useFilterStore';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
}

export function LedgerTable({ entries, onReverse }: LedgerTableProps) {
  const { format, code } = useCurrency();
  const { fundId, startDate, endDate, setFundId, setDateRange } = useFilterStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (fundId && entry.fundId !== fundId) return false;
      if (startDate && new Date(entry.createdAt).toISOString().split('T')[0] < startDate)
        return false;
      if (endDate && new Date(entry.createdAt).toISOString().split('T')[0] > endDate)
        return false;
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
  }, [entries, fundId, startDate, endDate, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search ledger entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm min-w-[200px] flex-1"
        />
        <Input
          type="date"
          value={startDate || ''}
          onChange={(e) => setDateRange(e.target.value || null, endDate)}
          className="w-auto"
        />
        <Input
          type="date"
          value={endDate || ''}
          onChange={(e) => setDateRange(startDate, e.target.value || null)}
          className="w-auto"
        />
        <Input
          placeholder="Fund ID"
          value={fundId || ''}
          onChange={(e) => setFundId(e.target.value || null)}
          className="max-w-[150px]"
        />
      </div>

      <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-navy-50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount ({code})</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-navy-500">
                  No ledger entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const isReversal = entry.type === 'REVERSAL';
                const isReversed = !!entry.reversedById;
                const disableReverse = isReversal || isReversed;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-navy-900">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
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
                          disabled={disableReverse}
                          onClick={() => onReverse(entry.id)}
                        >
                          Reverse
                        </Button>
                      </PermissionGuard>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}