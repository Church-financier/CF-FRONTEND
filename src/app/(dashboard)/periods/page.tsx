'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useAuthStore } from '@/store/useAuthStore';

interface Period {
  id: string;
  fiscalYear: number;
  month: number;
  isLocked: boolean;
  lockedAt: string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PeriodsPage() {
  return (
    <PermissionGuard
      allowedRoles={['SUPER_ADMIN', 'TREASURER', 'AUDITOR']}
      fallback={
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <p className="text-navy-500">You do not have permission to view periods.</p>
        </div>
      }
    >
      <PeriodsContent />
    </PermissionGuard>
  );
}

function PeriodsContent() {
  const { user } = useAuthStore();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Period[]>('/periods');
      setPeriods(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lock = async () => {
    try {
      await apiFetch('/periods/lock', { method: 'POST', body: JSON.stringify({ fiscalYear, month }) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to lock period');
    }
  };

  const unlock = async (fy: number, mo: number) => {
    try {
      await apiFetch('/periods/unlock', { method: 'POST', body: JSON.stringify({ fiscalYear: fy, month: mo }) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlock period');
    }
  };

  return (
    <div className="space-y-6">
      <Header title="Period Locking" />
      <p className="text-sm text-navy-600">
        Lock a fiscal period to prevent new ledger entries from being posted. Useful for month-end / year-end close.
      </p>

      {(user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') && (
        <div className="flex flex-col items-stretch gap-3 rounded-lg border border-navy-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-sm font-medium text-navy-700" htmlFor="period-fiscal-year">Fiscal Year</label>
            <Input id="period-fiscal-year" type="number" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} className="w-full sm:w-32" />
          </div>
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-sm font-medium text-navy-700" htmlFor="period-month">Month</label>
            <select
              id="period-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm sm:w-auto"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <Button onClick={lock} className="w-full sm:w-auto">Lock Period</Button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading periods...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Locked At</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-navy-500">No locked periods yet</td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-900">{MONTHS[p.month - 1]} {p.fiscalYear}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={p.isLocked ? 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800' : 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'}>
                        {p.isLocked ? 'LOCKED' : 'OPEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">{p.lockedAt ? new Date(p.lockedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {p.isLocked && user?.role === 'SUPER_ADMIN' && (
                        <Button variant="outline" size="sm" onClick={() => unlock(p.fiscalYear, p.month)}>
                          Unlock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
