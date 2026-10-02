'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';

/** Active expense accounts, already filtered server-side. */
interface Category {
  id: string;
  code: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  headId?: string;
}

interface BudgetItem {
  id: string;
  departmentBudgetId: string;
  categoryId: string;
  itemName: string;
  description: string | null;
  unitCost: string;
  quantity: number;
  proposedTotal: string;
  approvedTotal: string | null;
  category: { id: string; code: string; name: string; type: string };
}

interface DepartmentBudget {
  id: string;
  budgetPeriodId: string;
  departmentId: string;
  submittedByUserId: string;
  totalProposedAmount: string;
  totalApprovedAmount: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVISED' | 'APPROVED' | 'REJECTED';
  rejectionNotes: string | null;
  department: { id: string; name: string };
  submittedBy: { id: string; name: string };
  items: BudgetItem[];
}

interface BudgetPeriod {
  id: string;
  fiscalYear: number;
  status: 'DRAFT' | 'SUBMISSION_OPEN' | 'UNDER_REVIEW' | 'APPROVED_AND_LOCKED';
  submissionDeadline: string | null;
  departmentBudgets: DepartmentBudget[];
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

type EditableItem = {
  id?: string;
  categoryId: string;
  itemName: string;
  description: string;
  unitCost: string;
  quantity: string;
};

function proposedTotalKobo(item: EditableItem, toMinorUnits: (value: number | string) => number): number {
  const unit = toMinorUnits(item.unitCost);
  const qty = parseInt(item.quantity, 10) || 0;
  return unit * qty;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-navy-100 text-navy-800',
    SUBMITTED: 'bg-amber-100 text-amber-800',
    REVISED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return map[status] ?? 'bg-navy-100 text-navy-800';
}

function toEditable(item: BudgetItem, toInputValue: (value: string | number) => string): EditableItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    itemName: item.itemName,
    description: item.description ?? '',
    unitCost: toInputValue(item.unitCost),
    quantity: String(item.quantity),
  };
}

export default function DepartmentBudgetPage() {
  const { user } = useAuthStore();
  const { format, code, toMinorUnits, toInputValue } = useCurrency();
  const [activePeriod, setActivePeriod] = useState<BudgetPeriod | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myDeptBudget, setMyDeptBudget] = useState<DepartmentBudget | null>(null);
  const [localItems, setLocalItems] = useState<EditableItem[]>([]);
  const [history, setHistory] = useState<BudgetPeriod[]>([]);
  const [historyOpen, setHistoryOpen] = useState<{ period: BudgetPeriod; budget: DepartmentBudget } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadReferenceData = useCallback(async () => {
    try {
      const [depRes, catRes] = await Promise.all([
        apiFetch<PaginatedResponse<Department>>('/departments?page=1&pageSize=100'),
        apiFetch<PaginatedResponse<Category>>('/budget/expense-categories'),
      ]);
      setDepartments(depRes.data);
      setCategories(catRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reference data');
    }
  }, []);

  const loadActive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [periodRes, historyRes] = await Promise.all([
        apiFetch<BudgetPeriod | null>('/budget/periods/active'),
        apiFetch<PaginatedResponse<BudgetPeriod>>('/budget/periods?page=1&pageSize=20'),
      ]);
      setActivePeriod(periodRes);
      setHistory(
        (historyRes?.data ?? []).filter(
          (p) => p.status === 'APPROVED_AND_LOCKED' && p.fiscalYear < new Date().getFullYear()
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgeting period');
      setActivePeriod(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const myDepartment = departments.find((d) => d.headId === user?.id);

  const ensureMyBudget = useCallback(async (period: BudgetPeriod) => {
    if (!myDepartment) return;
    const existing = period.departmentBudgets?.find((db) => db.departmentId === myDepartment.id);
    if (existing) {
      setMyDeptBudget(existing);
      setLocalItems(existing.items.map((item) => toEditable(item, toInputValue)));
      return;
    }
    if (period.status !== 'SUBMISSION_OPEN') return;
    try {
      const created = await apiFetch<DepartmentBudget>('/budget/department-budgets', {
        method: 'POST',
        body: JSON.stringify({ budgetPeriodId: period.id, departmentId: myDepartment.id }),
      });
      setMyDeptBudget({ ...created, items: [] });
      setLocalItems([{ categoryId: '', itemName: '', description: '', unitCost: '', quantity: '1' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create your department budget');
    }
  }, [myDepartment, toInputValue]);

  useEffect(() => {
    void loadReferenceData();
    void loadActive();
  }, [loadReferenceData, loadActive]);

  useEffect(() => {
    if (activePeriod && myDepartment) {
      void ensureMyBudget(activePeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriod, myDepartment, ensureMyBudget]);

  const canEdit =
    !!myDeptBudget &&
    (myDeptBudget.status === 'DRAFT' || myDeptBudget.status === 'REVISED') &&
    (activePeriod?.status === 'SUBMISSION_OPEN' || activePeriod?.status === 'UNDER_REVIEW');

  const totalProposed = localItems.reduce((sum, i) => sum + proposedTotalKobo(i, toMinorUnits), 0);
  const budgetSubmitted = !!myDeptBudget && ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(myDeptBudget.status);

  const addItem = () => {
    if (!canEdit) return;
    setLocalItems([...localItems, { categoryId: '', itemName: '', description: '', unitCost: '', quantity: '1' }]);
  };

  const updateItem = (index: number, field: keyof EditableItem, value: string) => {
    setLocalItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeItem = async (index: number) => {
    const item = localItems[index];
    if (!item) return;
    if (item.id) {
      try {
        await apiFetch(`/budget/budget-items/${item.id}`, { method: 'DELETE' });
        setLocalItems((prev) => prev.filter((_, i) => i !== index));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove item');
      }
      return;
    }
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  };

  const saveItem = async (index: number) => {
    const item = localItems[index];
    if (!item || !myDeptBudget) return;
    const unitCost = toMinorUnits(item.unitCost);
    const quantity = parseInt(item.quantity, 10) || 1;
    if (!item.categoryId || !item.itemName.trim() || unitCost <= 0 || quantity <= 0) {
      setError('Please fill in category, item name, a valid unit cost and quantity');
      return;
    }
    setSavingKey(item.id ?? `new-${index}`);
    setError(null);
    try {
      const payload = {
        departmentBudgetId: myDeptBudget.id,
        categoryId: item.categoryId,
        itemName: item.itemName,
        description: item.description,
        unitCost,
        quantity,
        proposedTotal: unitCost * quantity,
      };
      if (item.id) {
        await apiFetch(`/budget/budget-items/${item.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const saved = await apiFetch<BudgetItem>('/budget/budget-items', { method: 'POST', body: JSON.stringify(payload) });
        setLocalItems((prev) => {
          const copy = [...prev];
          copy[index] = { ...item, id: saved.id };
          return copy;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSubmit = async () => {
    if (!myDeptBudget) return;
    if (localItems.some((i) => !i.categoryId || !i.itemName.trim() || toMinorUnits(i.unitCost) <= 0)) {
      setError('All line items must have a category, name and a valid unit cost');
      return;
    }
    if (!window.confirm('Submit this budget to the finance team? After submitting, editing is locked until sent back for revision.')) {
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const updated = await apiFetch<DepartmentBudget>(`/budget/department-budgets/${myDeptBudget.id}/submit`, {
        method: 'POST',
      });
      setMyDeptBudget(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit budget');
    } finally {
      setSubmitting(false);
    }
  };

  const loadHistoryDetail = async (periodId: string) => {
    if (!myDepartment) return;
    try {
      const detail = await apiFetch<BudgetPeriod>(`/budget/periods/${periodId}`);
      const budget = detail.departmentBudgets?.find((db) => db.departmentId === myDepartment.id);
      if (budget) setHistoryOpen({ period: detail, budget });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical budget');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Header
        title="Department Budget"
        right={
          myDepartment ? (
            <span className="text-sm text-navy-300">
              Department: <strong className="text-navy-100">{myDepartment.name}</strong>
            </span>
          ) : (
            <span className="text-sm text-navy-400">Loading department…</span>
          )
        }
      />

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}

      {!myDepartment && !loading && !error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          You are not assigned as the head of any department. Contact your Super Admin.
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading budgeting period…</div>
        </div>
      )}

      {!loading && activePeriod ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:col-span-3">
            <h2 className="text-lg font-semibold text-navy-900">
              FY-{activePeriod.fiscalYear} Budgeting Period
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activePeriod.status === 'APPROVED_AND_LOCKED'
                  ? 'bg-green-100 text-green-800'
                  : activePeriod.status === 'UNDER_REVIEW'
                  ? 'bg-amber-100 text-amber-800'
                  : activePeriod.status === 'SUBMISSION_OPEN'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-navy-100 text-navy-800'
              }`}
            >
              {activePeriod.status.replace(/_/g, ' ')}
            </span>
          </div>

          {activePeriod.submissionDeadline && (
            <div className="md:col-span-3">
              <p className="text-sm text-navy-500">Submission deadline: {new Date(activePeriod.submissionDeadline).toLocaleDateString()}</p>
            </div>
          )}

          <div className="md:col-span-3">
            {myDeptBudget ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(myDeptBudget.status)}`}>
                    {myDeptBudget.status}
                  </span>
                  <span className="text-sm text-navy-600">
                    Proposed total: <strong>{format(myDeptBudget.totalProposedAmount)}</strong>
                  </span>
                </div>

                {myDeptBudget.rejectionNotes && (
                  <div className="mb-3 p-3 text-sm text-navy-700 bg-blue-50 border border-blue-200 rounded-md">
                    <span className="font-medium">Notes from review:</span> {myDeptBudget.rejectionNotes}
                  </div>
                )}

                <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[56rem]">
                    <thead className="bg-navy-50 border-b border-navy-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-navy-700 uppercase">Category</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-navy-700 uppercase">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-navy-700 uppercase">Description</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-navy-700 uppercase">Unit Cost ({code})</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-navy-700 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-navy-700 uppercase">Proposed Total</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-navy-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-200">
                      {localItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-navy-400">
                            No line items yet.
                          </td>
                        </tr>
                      ) : (
                        localItems.map((item, idx) => {
                          const lineTotal = proposedTotalKobo(item, toMinorUnits);
                          const isNew = !item.id;
                          const isSaving = savingKey === (isNew ? `new-${idx}` : item.id);
                          return (
                            <tr key={item.id ?? `new-${idx}`} className="align-top">
                              <td className="px-3 py-2">
                                {canEdit ? (
                                  <select
                                    className="w-full h-9 rounded-md border border-navy-300 bg-white px-2 text-sm"
                                    value={item.categoryId}
                                    onChange={(e) => updateItem(idx, 'categoryId', e.target.value)}
                                  >
                                    <option value="">Select…</option>
                                    {categories.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.code} — {c.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm text-navy-600">
                                    {categories.find((c) => c.id === item.categoryId)?.name ?? '—'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {canEdit ? (
                                  <Input
                                    className="w-full"
                                    value={item.itemName}
                                    onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                                    placeholder="e.g. Youth Camp Sound Equipment"
                                  />
                                ) : (
                                  item.itemName
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {canEdit ? (
                                  <Input
                                    className="w-full"
                                    value={item.description}
                                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                  />
                                ) : (
                                  item.description || '—'
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {canEdit ? (
                                  <Input
                                    className="w-full text-right"
                                    value={item.unitCost}
                                    onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                                    placeholder="0.00"
                                  />
                                ) : (
                                  <span className="text-sm text-navy-600 text-right block">{item.unitCost || '—'}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {canEdit ? (
                                  <Input
                                    type="number"
                                    min={1}
                                    className="w-full text-right"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                  />
                                ) : (
                                  <span className="text-sm text-navy-600 text-right block">{item.quantity}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="text-sm text-navy-900 font-medium">{format(lineTotal)}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {canEdit && isNew && (
                                  <Button size="sm" onClick={() => saveItem(idx)} disabled={isSaving}>
                                    {isSaving ? 'Adding…' : 'Add'}
                                  </Button>
                                )}
                                {canEdit && !isNew && (
                                  <div className="flex flex-wrap justify-center gap-1">
                                    <Button size="sm" variant="outline" onClick={() => saveItem(idx)} disabled={isSaving}>
                                      {isSaving ? 'Saving…' : 'Save'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-700 border-red-300"
                                      onClick={() => removeItem(idx)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-navy-600">
                    Department total ({localItems.length} item{localItems.length !== 1 ? 's' : ''})
                  </div>
                  <div className="text-xl font-bold text-navy-900">{format(totalProposed)}</div>
                </div>

                {canEdit && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button onClick={addItem} className="w-full sm:w-auto">Add Line Item</Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        await loadActive();
                        if (activePeriod && myDepartment) await ensureMyBudget(activePeriod);
                      }}
                    >
                      Refresh
                    </Button>
                  </div>
                )}

                {!budgetSubmitted && canEdit && (
                  <Button className="mt-4 w-full md:w-auto" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Budget'}
                  </Button>
                )}

                {!budgetSubmitted && !canEdit && (
                  <p className="mt-4 text-sm text-navy-500">
                    {activePeriod.status === 'SUBMISSION_OPEN'
                      ? myDeptBudget
                        ? 'Your budget has been submitted and is awaiting review.'
                        : 'No budget to submit.'
                      : 'The submission window is not currently open.'}
                  </p>
                )}
              </>
            ) : (
              <p className="text-navy-600">
                {activePeriod.status === 'SUBMISSION_OPEN'
                  ? 'You do not have a department budget for this period yet. One will be created when you add your first line item.'
                  : 'Budget submissions are not currently open.'}
              </p>
            )}
          </div>
        </div>
      ) : !loading && !activePeriod ? (
        <div className="bg-white rounded-lg border border-navy-200 p-6 text-center">
          <p className="text-navy-600">There is no active budgeting period for your organization.</p>
        </div>
      ) : null}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-3">Previous Approved Budgets</h2>
          <div className="space-y-3">
            {history.map((p) => (
              <button
                key={p.id}
                onClick={() => loadHistoryDetail(p.id)}
                className="text-left w-full p-3 rounded-md border border-navy-200 hover:bg-navy-50"
              >
                <span className="font-medium text-navy-900">FY-{p.fiscalYear}</span>
                <span className="ml-2 text-xs text-navy-500">APPROVED_AND_LOCKED</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!historyOpen} onOpenChange={(open) => !open && setHistoryOpen(null)}>
        {historyOpen && (
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                FY-{historyOpen.period.fiscalYear} — {historyOpen.budget.department?.name} (read-only)
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-navy-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Approved Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-200">
                  {historyOpen.budget.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-navy-700">{it.category?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-navy-900">{it.itemName}</td>
                      <td className="px-3 py-2 text-right">{format(it.unitCost)}</td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {format(it.approvedTotal ?? it.proposedTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
