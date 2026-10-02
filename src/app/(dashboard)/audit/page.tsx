'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { PermissionGuard } from '@/components/PermissionGuard';

const RESOURCE_SINGULAR: Record<string, string> = {
  funds: 'Fund',
  'chart-of-accounts': 'Chart Of Account',
  pledges: 'Pledge',
  contributions: 'Contribution',
  vendors: 'Vendor',
  disbursements: 'Disbursement Request',
  users: 'User',
  departments: 'Department',
  budgets: 'Budget',
  members: 'Member',
  'ledger-entries': 'Ledger Entry',
  'journal-entries': 'Journal Entry',
  periods: 'Period',
};

const toTitleCase = (str: string) =>
  str
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const singularizeResource = (resource: string): string => {
  const lower = resource.toLowerCase();
  if (RESOURCE_SINGULAR[lower]) return RESOURCE_SINGULAR[lower];
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes')) return lower.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1);
  return resource;
};

const describeHttpLog = (
  details: Record<string, unknown>,
  format: (value: number) => string
): string => {
  const path = typeof details.path === 'string' ? details.path : '';
  const method = typeof details.method === 'string' ? details.method : '';
  const body = (details.body && typeof details.body === 'object') ? details.body as Record<string, unknown> : {};
  const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const rawResource = segments[0] || '';
  const resource = singularizeResource(toTitleCase(rawResource));
  const actionWord = (() => {
    if (method === 'POST') return 'Created';
    if (method === 'PATCH' || method === 'PUT') {
      if (path.includes('approve')) return 'Approved';
      if (path.includes('reject')) return 'Rejected';
      if (path.includes('reverse')) return 'Reversed';
      if (path.includes('cancel')) return 'Cancelled';
      if (path.includes('mark-paid')) return 'Marked as paid';
      if (path.includes('first-approve')) return 'First approved';
      if (path.includes('second-approve')) return 'Second approved';
      if (path.includes('role')) return 'Updated role for';
      return 'Updated';
    }
    if (method === 'DELETE') return 'Deleted';
    return 'Accessed';
  })();

  if (path.includes('/batch') && Array.isArray(body.entries) && body.entries.length > 0) {
    const count = body.entries.length;
    const totalKobo = body.entries.reduce((sum: number, entry: Record<string, unknown>) => {
      const amount = typeof entry.amountInKobo === 'number' ? entry.amountInKobo : 0;
      return sum + amount;
    }, 0);
    const total = format(totalKobo);
    return `Batch created ${count} ${resource.toLowerCase()}(s) totaling ${total}`;
  }

  const identifier =
    (typeof body.name === 'string' && body.name) ||
    (typeof body.code === 'string' && body.code) ||
    (typeof body.memberName === 'string' && body.memberName) ||
    (typeof body.email === 'string' && body.email) ||
    (typeof body.purpose === 'string' && body.purpose) ||
    (typeof body.description === 'string' && body.description) ||
    (segments.length > 1 ? segments[1] : '');

  return identifier ? `${actionWord} ${resource}: ${identifier}` : `${actionWord} ${resource}`;
};

const describeEntityLog = (action: string, details: Record<string, unknown>): string => {
  const entity = typeof details.entity === 'string' ? singularizeResource(details.entity) : 'Record';
  const actionText = (() => {
    if (action.includes('CREATE')) return 'Created a new';
    if (action.includes('UPDATE')) return 'Updated';
    if (action.includes('DELETE')) return 'Deleted';
    if (action.includes('VOID')) return 'Voided';
    return 'Modified';
  })();
  return `${actionText} ${entity}`;
};

const describePeriodLog = (action: string, details: Record<string, unknown>): string => {
  const year = typeof details.fiscalYear === 'number' ? details.fiscalYear : '?';
  const month = typeof details.month === 'number' ? details.month : '?';
  const label = action.includes('LOCK') ? 'Locked' : 'Unlocked';
  return `${label} fiscal year ${year}, month ${month}`;
};

const getDescription = (
  action: string,
  details: unknown,
  format: (value: number) => string
): string => {
  if (!details || typeof details !== 'object') return action;
  const d = details as Record<string, unknown>;
  if (d.description && typeof d.description === 'string') return d.description;
  if (d.path && d.method) return describeHttpLog(d, format);
  if (d.entity && d.entityId) return describeEntityLog(action, d);
  if (d.fiscalYear !== undefined && d.month !== undefined) return describePeriodLog(action, d);
  return action;
};

interface AuditEntry {
  id: string;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
  description?: string;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  return (
    <PermissionGuard permission="audit:read" fallback={
      <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
        <p className="text-navy-500">You do not have permission to view audit logs.</p>
      </div>
    }>
      <AuditLogsContent />
    </PermissionGuard>
  );
}

function AuditLogsContent() {
  const { format } = useCurrency();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '50');
      if (actionFilter) params.set('action', actionFilter);
      const data = await apiFetch<AuditResponse>(`/audit-logs?${params.toString()}`);
      setLogs(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Header
        title="Audit Logs"
        right={
          <Input
            placeholder="Filter by action (e.g. CREATE_FUND)"
            aria-label="Filter audit logs by action"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-72"
          />
        }
      />

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading audit logs...</div>
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-navy-500">No audit logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-xs text-navy-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-navy-900">
                      {log.user.name}
                      <span className="block text-xs text-navy-500">{log.user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-900">
                      {log.description || getDescription(log.action, log.details, format)}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500">{log.ipAddress || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-navy-500">Showing {logs.length} of {total} entries</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-navy-300 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length === 0 || page * 50 >= total}
            className="px-3 py-1 text-sm border border-navy-300 rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
