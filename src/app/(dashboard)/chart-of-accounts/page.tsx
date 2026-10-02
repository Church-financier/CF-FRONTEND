'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { PermissionGuard } from '@/components/PermissionGuard';

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  parent?: { id: string; code: string; name: string } | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const ACCOUNT_TYPES: ChartOfAccount['type'][] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

const EMPTY_FORM = {
  code: '',
  name: '',
  type: 'ASSET' as ChartOfAccount['type'],
  parentAccountCode: '',
  isActive: true,
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<PaginatedResponse<ChartOfAccount>>(
        '/chart-of-accounts?page=1&pageSize=100'
      );
      setAccounts(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const closeDialogs = () => {
    setOpen(false);
    setEditing(null);
    setFormData(EMPTY_FORM);
  };

  const startCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setOpen(true);
  };

  const startEdit = (account: ChartOfAccount) => {
    setEditing(account);
    setError(null);
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      parentAccountCode: account.parent?.code ?? '',
      isActive: account.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        parentAccountCode: formData.parentAccountCode || undefined,
      };
      if (editing) {
        // An empty parent code detaches the account from its parent, so it is
        // sent as an empty string rather than omitted.
        await apiFetch(`/chart-of-accounts/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, parentAccountCode: formData.parentAccountCode }),
        });
      } else {
        await apiFetch('/chart-of-accounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      closeDialogs();
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editing ? 'update' : 'create'} account`);
    } finally {
      setSubmitting(false);
    }
  };

  /** Activate / deactivate an account without opening the full editor. */
  const toggleActive = async (account: ChartOfAccount) => {
    if (togglingId) return;
    setTogglingId(account.id);
    setError(null);
    try {
      await apiFetch(`/chart-of-accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Chart of Accounts"
        right={
          <PermissionGuard permission="chart-of-accounts:create">
            <Button onClick={startCreate}>Add Account</Button>
          </PermissionGuard>
        }
      />

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading accounts...</div>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-x-auto">
          <table className="w-full min-w-[44rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Parent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy-500">
                    No accounts found
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium">
                      {account.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-900">{account.name}</td>
                    <td className="px-4 py-3 text-sm text-navy-600">{account.type}</td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {account.parent
                        ? `${account.parent.code} - ${account.parent.name}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <PermissionGuard permission="chart-of-accounts:update" fallback={null}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(account)}
                            disabled={togglingId === account.id}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(account)}
                            disabled={togglingId === account.id}
                          >
                            {togglingId === account.id
                              ? 'Saving...'
                              : account.isActive
                                ? 'Deactivate'
                                : 'Activate'}
                          </Button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) closeDialogs(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'Create New Account'}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Account Code
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Account Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as ChartOfAccount['type'] })
                }
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Parent Account Code {editing ? '(leave blank to detach)' : '(optional)'}
              </label>
              <Input
                value={formData.parentAccountCode}
                onChange={(e) => setFormData({ ...formData, parentAccountCode: e.target.value })}
                placeholder="e.g. 1001"
                list="account-codes"
              />
              <datalist id="account-codes">
                {accounts
                  .filter((account) => account.id !== editing?.id)
                  .map((account) => (
                    <option key={account.id} value={account.code}>
                      {account.name}
                    </option>
                  ))}
              </datalist>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              <label htmlFor="active" className="text-sm text-navy-700">
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialogs} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : editing
                    ? 'Save Changes'
                    : 'Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
