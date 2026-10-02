'use client';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useEffect, useState, useCallback } from 'react';

interface Fund {
  id: string;
  name: string;
  description: string | null;
  isRestricted: boolean;
  createdAt: string;
  inflowInKobo: string;
  outflowInKobo: string;
  balanceInKobo: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export default function FundsPage() {
  const { format } = useCurrency();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isRestricted: false,
  });

  const loadFunds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<PaginatedResponse<Fund>>('/funds?page=1&pageSize=100');
      setFunds(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load funds');
      setFunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiFetch('/funds', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setFormData({ name: '', description: '', isRestricted: false });
      setOpen(false);
      await loadFunds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fund');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Fund Management"
        right={
          <PermissionGuard permission="fund:create" fallback={null}>
            <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>Add Fund</Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Fund</DialogTitle>
              </DialogHeader>
              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Fund Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="restricted"
                    checked={formData.isRestricted}
                    onChange={(e) =>
                      setFormData({ ...formData, isRestricted: e.target.checked })
                    }
                  />
                  <label htmlFor="restricted" className="text-sm text-navy-700">
                    Restricted Fund
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Fund'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </PermissionGuard>
        }
      />

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading funds...</div>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Restricted
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Inflow
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Outflow
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {funds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy-500">
                    No funds found
                  </td>
                </tr>
              ) : (
                funds.map((fund) => (
                  <tr key={fund.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium">
                      {fund.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {fund.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {fund.isRestricted ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-700 text-right">
                      {format(Number(fund.inflowInKobo))}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-700 text-right">
                      {format(Number(fund.outflowInKobo))}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold text-right ${
                        Number(fund.balanceInKobo) < 0 ? 'text-red-700' : 'text-navy-900'
                      }`}
                    >
                      {format(Number(fund.balanceInKobo))}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {new Date(fund.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {funds.length > 0 && (
              <tfoot className="bg-navy-50 border-t-2 border-navy-300">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-navy-900" colSpan={3}>
                    Total across accounts
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-navy-900 text-right">
                    {format(funds.reduce((sum, f) => sum + Number(f.inflowInKobo), 0))}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-navy-900 text-right">
                    {format(funds.reduce((sum, f) => sum + Number(f.outflowInKobo), 0))}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-navy-900 text-right">
                    {format(funds.reduce((sum, f) => sum + Number(f.balanceInKobo), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
