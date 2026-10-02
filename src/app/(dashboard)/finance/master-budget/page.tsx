'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { isRole } from '@/lib/permissions';

interface Category {
  id: string;
  code: string;
  name: string;
  type: string;
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
  category: Category;
}

interface DepartmentBudget {
  id: string;
  budgetPeriodId: string;
  departmentId: string;
  submittedByUserId: string;
  totalProposedAmount: string;
  totalApprovedAmount: string;
  status: string;
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

interface Metrics {
  totalFunds: string;
  totalContributions: string;
  totalExpenses: string;
  netIncome: string;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-navy-100 text-navy-800',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  REVISED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function MasterBudgetPage() {
  const { user } = useAuthStore();
  const { format, code, toMinorUnits, toInputValue } = useCurrency();
  const [period, setPeriod] = useState<BudgetPeriod | null>(null);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<DepartmentBudget | null>(null);
  const [approvedEdits, setApprovedEdits] = useState<Record<string, number>>({});
  const [noteForId, setNoteForId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteAction, setNoteAction] = useState<'return' | 'reject'>('return');

  const isSuperAdmin = isRole(user?.role, 'SUPER_ADMIN');
  const isTreasurer = isRole(user?.role, 'TREASURER');
  const isAllowed = isSuperAdmin || isTreasurer;

  const canAdjust = !!period && period.status === 'UNDER_REVIEW';

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [periodRes, metricsRes, periodsRes] = await Promise.all([
        apiFetch<BudgetPeriod | null>('/budget/periods/active'),
        apiFetch<Metrics>('/reports/metrics'),
        apiFetch<PaginatedResponse<BudgetPeriod>>('/budget/periods?page=1&pageSize=50'),
      ]);
      setPeriod(periodRes);
      setPeriods(periodsRes?.data ?? []);
      setMetrics(metricsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (!user) return null;
  if (!isAllowed) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-navy-900">403 - Unauthorized</h2>
        <p className="text-navy-500 mt-2">Only Treasurers and Super Admins can access the Master Budget Builder.</p>
      </div>
    );
  }

  const deptBudgets = period?.departmentBudgets ?? [];
  const totalProposed = deptBudgets.reduce(
    (sum, db) => sum + Number(db.totalProposedAmount ?? 0),
    0
  );
  const totalApproved = deptBudgets.reduce(
    (sum, db) => sum + Number(db.totalApprovedAmount ?? 0),
    0
  );

  const openAdjuster = (db: DepartmentBudget) => {
    setAdjusting(db);
    const edits: Record<string, number> = {};
    db.items.forEach((it) => {
      edits[it.id] = Number(it.approvedTotal ?? it.proposedTotal ?? 0);
    });
    setApprovedEdits(edits);
  };

  const approveBudget = async () => {
    if (!adjusting) return;
    const items = adjusting.items.map((it) => ({
      budgetItemId: it.id,
      approvedTotal: approvedEdits[it.id] ?? Number(it.proposedTotal ?? 0),
    }));
    try {
      await apiFetch(`/budget/department-budgets/${adjusting.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      setAdjusting(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve budget');
    }
  };

  const bulkSaveApprovals = async () => {
    if (!adjusting) return;
    const items = adjusting.items
      .filter((it) => approvedEdits[it.id] !== undefined)
      .map((it) => ({ budgetItemId: it.id, approvedTotal: approvedEdits[it.id] }));
    try {
      await apiFetch(`/budget/budget-items/bulk-update-approved`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save approvals');
    }
  };

  const startNote = (action: 'return' | 'reject', db: DepartmentBudget) => {
    setNoteAction(action);
    setNoteForId(db.id);
    setNoteText('');
  };

  const sendNote = async () => {
    if (!noteForId || !noteText.trim()) {
      setError('Notes are required to return or reject a budget');
      return;
    }
    try {
      const url =
        noteAction === 'return'
          ? `/budget/department-budgets/${noteForId}/return`
          : `/budget/department-budgets/${noteForId}/reject`;
      await apiFetch(url, { method: 'POST', body: JSON.stringify({ rejectionNotes: noteText }) });
      setNoteForId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget');
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Master Budget Builder"
        right={
          period ? (
            <span className="text-sm text-navy-300">
              FY-{period.fiscalYear} ·{' '}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  period.status === 'APPROVED_AND_LOCKED'
                    ? 'bg-green-100 text-green-800'
                    : period.status === 'UNDER_REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : period.status === 'SUBMISSION_OPEN'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-navy-100 text-navy-800'
                }`}
              >
                {period.status.replace(/_/g, ' ')}
              </span>
            </span>
          ) : (
            <span className="text-sm text-navy-400">No active period</span>
          )
        }
      />

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}

      {/* Revenue vs. Expense Comparison */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="bg-white rounded-lg border border-navy-200 p-4">
          <p className="text-sm text-navy-500">Cumulative Department Requests</p>
          <p className="text-2xl font-bold text-navy-900">{format(totalProposed)}</p>
        </div>
        <div className="bg-white rounded-lg border border-navy-200 p-4">
          <p className="text-sm text-navy-500">Approved Budget</p>
          <p className="text-2xl font-bold text-navy-900">{format(totalApproved)}</p>
        </div>
        <div className="bg-white rounded-lg border border-navy-200 p-4">
          <p className="text-sm text-navy-500">Available Fund Balance</p>
          <p className="text-2xl font-bold text-navy-900">{format(metrics?.totalFunds ?? 0)}</p>
          <p className="text-xs text-navy-400 mt-1">
            {metrics ? (Number(metrics.totalFunds ?? 0) >= totalProposed ? 'Requests within balance' : 'Requests exceed balance') : '—'}
          </p>
        </div>
      </section>

      {/* Super Admin period controls */}
      {isSuperAdmin && (
        <section className="bg-white rounded-lg border border-navy-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-navy-700">Budget Period Controls</h2>
            <CreatePeriodForm onCreated={loadAll} onError={setError} />
          </div>
          <div className="space-y-2">
            {periods.length === 0 ? (
              <p className="text-sm text-navy-500">No budget periods created yet.</p>
            ) : (
              periods.map((p) => <PeriodRow key={p.id} period={p} onDone={loadAll} setError={setError} />)
            )}
          </div>
        </section>
      )}

      {/* Departmental Overview Grid */}
      <section className="bg-white rounded-lg border border-navy-200">
        <div className="px-4 py-3 border-b border-navy-200">
          <h2 className="text-lg font-semibold text-navy-900">Department Submissions</h2>
        </div>
        {!loading && deptBudgets.length === 0 ? (
          <div className="p-6 text-center text-navy-500">
            {period ? 'No departments have submitted budgets for this period.' : 'No active budgeting period.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-navy-50">
                <tr>
                  <th className="px-4 py-2 text-left">Department</th>
                  <th className="px-4 py-2 text-left">Submitted By</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Requested</th>
                  <th className="px-4 py-2 text-right">Approved</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {deptBudgets.map((db) => (
                  <tr key={db.id} className="hover:bg-navy-50">
                    <td className="px-4 py-2 text-navy-900 font-medium">{db.department?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-navy-600">{db.submittedBy?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          STATUS_COLOR[db.status] ?? 'bg-navy-100 text-navy-800'
                        }`}
                      >
                        {db.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{format(db.totalProposedAmount)}</td>
                    <td className="px-4 py-2 text-right">{format(db.totalApprovedAmount)}</td>
                    <td className="px-4 py-2 text-center">
                      {(db.status === 'SUBMITTED' || db.status === 'REVISED') && canAdjust && (
                        <div className="flex flex-wrap justify-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => openAdjuster(db)}>
                            Adjust Items
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const items = db.items.map((it) => ({
                                budgetItemId: it.id,
                                approvedTotal: Number(it.approvedTotal ?? it.proposedTotal ?? 0),
                              }));
                              try {
                                await apiFetch(`/budget/department-budgets/${db.id}/approve`, {
                                  method: 'POST',
                                  body: JSON.stringify({ items }),
                                });
                                await loadAll();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Failed to approve');
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => startNote('reject', db)}>
                            Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startNote('return', db)}>
                            Return
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Line-item adjustment dialog */}
      <Dialog open={!!adjusting} onOpenChange={(open) => !open && setAdjusting(null)}>
        {adjusting && (
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                {adjusting.department?.name} — Line Item Approval
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-sm">
                  <thead className="bg-navy-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Unit Cost</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Proposed</th>
                      <th className="px-3 py-2 text-right">Approved ({code})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-200">
                    {adjusting.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 text-navy-700">{it.category?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-navy-900">{it.itemName}</td>
                        <td className="px-3 py-2 text-right">{format(it.unitCost)}</td>
                        <td className="px-3 py-2 text-right">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{format(it.proposedTotal)}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            className="text-right"
                            value={toInputValue(approvedEdits[it.id] ?? 0)}
                            onChange={(e) =>
                              setApprovedEdits((prev) => ({
                                ...prev,
                                [it.id]: toMinorUnits(e.target.value),
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-navy-600">
                  Approved total: <strong>{format(Object.values(approvedEdits).reduce((a, b) => a + b, 0))}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setAdjusting(null)}>
                    Close
                  </Button>
                  <Button variant="outline" onClick={bulkSaveApprovals}>
                    Save Approvals
                  </Button>
                  <Button onClick={approveBudget}>Approve Department Budget</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Return/Reject notes dialog */}
      <Dialog open={!!noteForId} onOpenChange={(open) => !open && setNoteForId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{noteAction === 'return' ? 'Return for Revision' : 'Reject Budget'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await sendNote();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Notes (required)</label>
              <textarea
                className="w-full h-24 rounded-md border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Explain what needs to change…"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNoteForId(null)}>
                Cancel
              </Button>
              <Button type="submit" variant={noteAction === 'reject' ? 'destructive' : 'default'}>
                {noteAction === 'reject' ? 'Reject Budget' : 'Send Back'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePeriodForm({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onError(null);
    try {
      await apiFetch('/budget/periods', {
        method: 'POST',
        body: JSON.stringify({ fiscalYear, submissionDeadline: deadline ? new Date(deadline).toISOString() : undefined }),
      });
      setFiscalYear(new Date().getFullYear());
      setDeadline('');
      setOpen(false);
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save period');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Create Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget Period</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Fiscal Year</label>
            <Input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} min={2000} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Submission Deadline</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PeriodRow({
  period,
  onDone,
  setError,
}: {
  period: BudgetPeriod;
  onDone: () => Promise<void>;
  setError: (m: string | null) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const wrap = async (fn: () => Promise<unknown>, label: string) => {
    setLoading(label);
    try {
      await fn();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${label}`);
    } finally {
      setLoading(null);
    }
  };

  const deadline = period.submissionDeadline
    ? new Date(period.submissionDeadline).toISOString().split('T')[0]
    : '';

  const actions: { label: string; when: boolean; onClick: () => void }[] = [
    {
      label: 'Open',
      when: period.status === 'DRAFT',
      onClick: () =>
        wrap(
          () =>
            apiFetch(`/budget/periods/${period.id}/open-submission`, {
              method: 'POST',
              body: JSON.stringify({ submissionDeadline: deadline || new Date().toISOString() }),
            }),
          'open'
        ),
    },
    {
      label: 'Close',
      when: period.status === 'SUBMISSION_OPEN',
      onClick: () => wrap(() => apiFetch(`/budget/periods/${period.id}/close-submission`, { method: 'POST' }), 'close'),
    },
    {
      label: 'Approve & Lock',
      when: period.status === 'UNDER_REVIEW',
      onClick: () => wrap(() => apiFetch(`/budget/periods/${period.id}/approve-and-lock`, { method: 'POST' }), 'lock'),
    },
    {
      label: 'Unlock',
      when: period.status === 'APPROVED_AND_LOCKED',
      onClick: () =>
        wrap(
          () =>
            apiFetch(`/budget/periods/${period.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'UNDER_REVIEW' }),
            }),
          'unlock'
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-navy-200 bg-navy-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <span className="font-medium text-navy-900">FY-{period.fiscalYear}</span>
        <span className="ml-2 text-xs text-navy-500">{period.status.replace(/_/g, ' ')}</span>
        {deadline && <span className="ml-2 text-xs text-navy-400">deadline {deadline}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {actions
          .filter((a) => a.when)
          .map((a) => (
            <Button key={a.label} size="sm" variant="outline" onClick={a.onClick} disabled={!!loading}>
              {loading === a.label ? '…' : a.label}
            </Button>
          ))}
      </div>
    </div>
  );
}
