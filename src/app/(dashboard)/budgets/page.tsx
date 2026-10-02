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
import { PermissionGuard, hasPermissionFromStore } from '@/components/PermissionGuard';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface Department {
  id: string;
  name: string;
  headId?: string;
}

interface Fund {
  id: string;
  name: string;
}

interface Budget {
  id: string;
  departmentId: string;
  department: { id: string; name: string };
  fundId: string;
  fund: { id: string; name: string };
  fiscalYear: number;
  month: number;
  amountInKobo: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BudgetsPage() {
  const { user } = useAuthStore();
  const { format, code, toMinorUnits, toInputValue } = useCurrency();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [formData, setFormData] = useState({
    departmentId: '',
    fundId: '',
    fiscalYear: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: '',
  });

  const canCreate = hasPermissionFromStore(user?.role, 'budget:create');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [b, d, f] = await Promise.all([
        apiFetch<PaginatedResponse<Budget>>(
          `/budgets?page=1&pageSize=100${filterYear ? `&fiscalYear=${filterYear}` : ''}`
        ),
        apiFetch<PaginatedResponse<Department>>('/departments?page=1&pageSize=100'),
        apiFetch<PaginatedResponse<Fund>>('/funds?page=1&pageSize=100'),
      ]);
      setBudgets(b.data);
      setDepartments(d.data);
      setFunds(f.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [filterYear]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const resetForm = () => {
    setEditingBudget(null);
    setFormData({
      departmentId: '',
      fundId: '',
      fiscalYear: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      amount: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      departmentId: budget.departmentId,
      fundId: budget.fundId,
      fiscalYear: budget.fiscalYear,
      month: budget.month,
      amount: toInputValue(budget.amountInKobo),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        departmentId: formData.departmentId,
        fundId: formData.fundId,
        fiscalYear: formData.fiscalYear,
        month: formData.month,
        amountInKobo: toMinorUnits(formData.amount),
      };

      if (editingBudget) {
        await apiFetch(`/budgets/${editingBudget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setOpen(false);
      resetForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget allocation? This cannot be undone.')) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget');
    } finally {
      setSubmitting(false);
    }
  };

const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current - 2; y <= current + 3; y++) list.push(y);
    return list;
  }, []);

  const isDepartmentHead = user?.role === 'DEPARTMENT_HEAD';
  const userDepartmentId = departments.find((d) => d.headId === user?.id)?.id;

  const visibleBudgets = useMemo(() => {
    if (!isDepartmentHead || !userDepartmentId) return budgets;
    return budgets.filter((b) => b.departmentId === userDepartmentId);
  }, [budgets, isDepartmentHead, userDepartmentId]);

  return (
    <div className="space-y-6">
      <Header
        title="Budget Allocation"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              aria-label="Filter by fiscal year"
              className="h-10 w-full rounded-md border border-navy-300 bg-white px-3 text-sm text-navy-900 sm:w-auto"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetForm();
              }}
            >
              <PermissionGuard permission="budget:create" fallback={null}>
                <Button onClick={openCreate}>Add Budget</Button>
              </PermissionGuard>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBudget ? 'Edit Budget Allocation' : 'Create Budget Allocation'}
                  </DialogTitle>
                </DialogHeader>
                {error && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1">
                      Department
                    </label>
                    <select
                      className="w-full h-10 rounded-md border border-navy-300 bg-white px-3 text-sm"
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({ ...formData, departmentId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1">
                      Fund
                    </label>
                    <select
                      className="w-full h-10 rounded-md border border-navy-300 bg-white px-3 text-sm"
                      value={formData.fundId}
                      onChange={(e) => setFormData({ ...formData, fundId: e.target.value })}
                      required
                    >
                      <option value="">Select fund…</option>
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1">
                        Fiscal Year
                      </label>
                      <select
                        className="w-full h-10 rounded-md border border-navy-300 bg-white px-3 text-sm"
                        value={formData.fiscalYear}
                        onChange={(e) =>
                          setFormData({ ...formData, fiscalYear: Number(e.target.value) })
                        }
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1">
                        Month
                      </label>
                      <select
                        className="w-full h-10 rounded-md border border-navy-300 bg-white px-3 text-sm"
                        value={formData.month}
                        onChange={(e) =>
                          setFormData({ ...formData, month: Number(e.target.value) })
                        }
                      >
                        {MONTHS.map((name, i) => (
                          <option key={name} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1">
                      Amount ({code})
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving…' : editingBudget ? 'Update Budget' : 'Create Budget'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading budgets…</div>
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
            <table className="w-full min-w-[40rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Fund
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Allocated Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {visibleBudgets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-navy-500">
                    No budget allocations yet for {filterYear}. Click <strong>Add Budget</strong> to set one.
                  </td>
                </tr>
              ) : (
                visibleBudgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium">
                      {budget.department?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {budget.fund?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {MONTHS[budget.month - 1]} {budget.fiscalYear}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium text-right">
                      {format(budget.amountInKobo)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canCreate ? (
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(budget)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => handleDelete(budget.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-navy-400 italic">Read-only</span>
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