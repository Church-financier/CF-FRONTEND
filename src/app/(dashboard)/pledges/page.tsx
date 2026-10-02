'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Fund {
  id: string;
  name: string;
}

interface Pledge {
  id: string;
  memberId: string;
  memberName: string;
  fundId: string;
  amountInKobo: number;
  startDate: string | null;
  endDate: string | null;
  recurring: boolean;
  status: string;
  createdAt: string;
  totalReceivedInKobo: string;
  remainingInKobo: string;
  fulfilled: boolean;
}

interface MemberOption {
  id: string;
  fullName: string;
  memberNumber: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const CONTRIBUTION_TYPES = ['CASH', 'CHECK', 'ENVELOPE'] as const;

const today = () => new Date().toISOString().split('T')[0];

export default function PledgesPage() {
  const { format, code, symbol, toMinorUnits, toInputValue, inputStep, inputMin } = useCurrency();
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingPledge, setEditingPledge] = useState<Pledge | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payingPledge, setPayingPledge] = useState<Pledge | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', type: 'CASH', date: today(), notes: '' });
  const [payError, setPayError] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  // Ref guard: a double-click inside one tick would still read a stale
  // `submittingPayment`, and would post the installment twice.
  const paymentInFlight = useRef(false);
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    fundId: '',
    amountInKobo: '',
    startDate: '',
    endDate: '',
    recurring: false,
  });

  const loadPledges = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<PaginatedResponse<Pledge>>('/pledges?page=1&pageSize=100');
      setPledges(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pledges');
      setPledges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPledges();
  }, [loadPledges]);

  useEffect(() => {
    setLoadingFunds(true);
    Promise.all([
      apiFetch<Fund[]>('/contributions/funds'),
      apiFetch<PaginatedResponse<MemberOption>>('/members?page=1&pageSize=100'),
    ])
      .then(([fundsResponse, membersResponse]) => {
        setFunds(fundsResponse);
        setMembers(membersResponse.data);
      })
      .catch(() => undefined)
      .finally(() => setLoadingFunds(false));
  }, []);

  const isOverdue = (pledge: Pledge) =>
    pledge.status === 'ACTIVE' && !!pledge.endDate && new Date(pledge.endDate) < new Date();

  const visiblePledges = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pledges.filter((pledge) => {
      if (statusFilter === 'OVERDUE' && !isOverdue(pledge)) return false;
      if (statusFilter === 'COMPLETED' && pledge.status !== 'COMPLETED') return false;
      if (statusFilter === 'ACTIVE' && (pledge.status !== 'ACTIVE' || isOverdue(pledge))) return false;
      if (statusFilter === 'CANCELLED' && pledge.status !== 'CANCELLED') return false;
      if (!term) return true;
      return (
        pledge.memberName.toLowerCase().includes(term) ||
        (pledge.fundId || '').toLowerCase().includes(term)
      );
    });
  }, [pledges, search, statusFilter]);

  const totals = useMemo(() => {
    const outstanding = pledges
      .filter((pledge) => pledge.status === 'ACTIVE')
      .reduce((sum, pledge) => sum + Number(pledge.remainingInKobo || 0), 0);
    const received = pledges.reduce((sum, pledge) => sum + Number(pledge.totalReceivedInKobo || 0), 0);
    return { outstanding, received, overdue: pledges.filter(isOverdue).length };
  }, [pledges]);

  const resetForm = () =>
    setFormData({
      memberId: '',
      memberName: '',
      fundId: '',
      amountInKobo: '',
      startDate: '',
      endDate: '',
      recurring: false,
    });

  const selectMember = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    setFormData((current) => ({
      ...current,
      memberId,
      memberName: member ? member.fullName : current.memberName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(editingPledge ? `/pledges/${editingPledge.id}` : '/pledges', {
        method: editingPledge ? 'PATCH' : 'POST',
        body: JSON.stringify({
          memberId: formData.memberId,
          memberName: formData.memberName,
          fundId: formData.fundId,
          amountInKobo: toMinorUnits(formData.amountInKobo),
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          recurring: formData.recurring,
        }),
      });
      resetForm();
      setOpen(false);
      setEditingPledge(null);
      loadPledges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pledge');
    }
  };

  const editPledge = (pledge: Pledge) => {
    setEditingPledge(pledge);
    setFormData({
      memberId: pledge.memberId || '',
      memberName: pledge.memberName,
      fundId: pledge.fundId,
      amountInKobo: toInputValue(pledge.amountInKobo),
      startDate: pledge.startDate ? pledge.startDate.slice(0, 10) : '',
      endDate: pledge.endDate ? pledge.endDate.slice(0, 10) : '',
      recurring: pledge.recurring,
    });
    setOpen(true);
  };

  const cancelPledge = async (pledge: Pledge) => {
    if (!window.confirm(`Cancel the pledge for ${pledge.memberName}? Existing payments will be retained.`)) return;
    try {
      await apiFetch(`/pledges/${pledge.id}`, { method: 'DELETE' });
      loadPledges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel pledge');
    }
  };

  const openPayment = (pledge: Pledge) => {
    setPayingPledge(pledge);
    setPayError(null);
    setPayForm({
      amount: toInputValue(pledge.remainingInKobo || 0),
      type: 'CASH',
      date: today(),
      notes: '',
    });
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPledge || paymentInFlight.current) return;
    const amountInKobo = toMinorUnits(payForm.amount);
    if (amountInKobo <= 0) {
      setPayError('Enter an amount greater than zero.');
      return;
    }
    setPayError(null);
    paymentInFlight.current = true;
    setSubmittingPayment(true);
    try {
      await apiFetch('/contributions', {
        method: 'POST',
        body: {
          memberId: payingPledge.memberId,
          memberName: payingPledge.memberName,
          fundId: payingPledge.fundId,
          amountInKobo,
          type: payForm.type,
          date: payForm.date,
          notes: payForm.notes || undefined,
          pledgeId: payingPledge.id,
        },
      });
      setPayingPledge(null);
      await loadPledges();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to record pledge payment');
    } finally {
      paymentInFlight.current = false;
      setSubmittingPayment(false);
    }
  };

  const getFundName = (fundId: string) => {
    const fund = funds.find((f) => f.id === fundId);
    return fund ? fund.name : fundId;
  };

  return (
    <div className="space-y-6">
      <Header
        title="Pledge Tracking"
        right={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Input
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search pledges by member"
              className="w-full sm:w-56"
            />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm sm:w-auto"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="OVERDUE">Overdue</option>
              <option value="COMPLETED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <PermissionGuard permission="pledge:create">
              <Button
                onClick={() => {
                  setEditingPledge(null);
                  resetForm();
                  setOpen(true);
                }}
              >
                Add Pledge
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <p className="text-sm text-navy-500 mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-navy-900">{format(totals.outstanding)}</p>
        </div>
        <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <p className="text-sm text-navy-500 mb-1">Received to date</p>
          <p className="text-2xl font-bold text-navy-900">{format(totals.received)}</p>
        </div>
        <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <p className="text-sm text-navy-500 mb-1">Overdue pledges</p>
          <p className="text-2xl font-bold text-navy-900">{totals.overdue}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading pledges...</div>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem]">
              <thead>
                <tr className="bg-navy-50 border-b border-navy-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Fund
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Period
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
                {visiblePledges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-navy-500">
                      No pledges found
                    </td>
                  </tr>
                ) : (
                  visiblePledges.map((pledge) => (
                    <tr key={pledge.id} className="hover:bg-navy-50">
                      <td className="px-4 py-3 text-sm text-navy-900 font-medium">
                        {pledge.memberName}
                        {pledge.recurring && (
                          <span className="ml-2 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-medium text-navy-700">
                            Recurring
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600">{getFundName(pledge.fundId)}</td>
                      <td className="px-4 py-3 text-sm text-navy-900 text-right">
                        {format(pledge.amountInKobo)}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-900 text-right">
                        {format(Number(pledge.remainingInKobo))}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600 whitespace-nowrap">
                        {pledge.startDate ? new Date(pledge.startDate).toLocaleDateString() : '-'} -{' '}
                        {pledge.endDate ? new Date(pledge.endDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600">
                        <div className="mb-1 text-xs">
                          Received {format(Number(pledge.totalReceivedInKobo))} of{' '}
                          {format(Number(pledge.amountInKobo))}
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pledge.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : isOverdue(pledge)
                                ? 'bg-amber-100 text-amber-800'
                                : pledge.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isOverdue(pledge) ? 'OVERDUE' : pledge.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <PermissionGuard permission="contribution:create" fallback={null}>
                            {pledge.status !== 'CANCELLED' && !pledge.fulfilled && (
                              <Button size="sm" onClick={() => openPayment(pledge)}>
                                Record Payment
                              </Button>
                            )}
                          </PermissionGuard>
                          <PermissionGuard permission="pledge:update">
                            {pledge.status !== 'CANCELLED' && pledge.status !== 'COMPLETED' && (
                              <Button size="sm" variant="outline" onClick={() => editPledge(pledge)}>
                                Edit
                              </Button>
                            )}
                          </PermissionGuard>
                          <PermissionGuard permission="pledge:delete">
                            {pledge.status !== 'CANCELLED' && (
                              <Button size="sm" variant="outline" onClick={() => cancelPledge(pledge)}>
                                Cancel
                              </Button>
                            )}
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditingPledge(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPledge ? 'Edit Pledge' : 'Create New Pledge'}</DialogTitle>
            <DialogDescription>
              {editingPledge
                ? 'Update the commitment details for this pledge.'
                : 'Record a new pledge commitment against a member and fund.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Member
              </label>
              <select
                value={formData.memberId}
                onChange={(e) => selectMember(e.target.value)}
                required
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                    {member.memberNumber ? ` (${member.memberNumber})` : ''}
                  </option>
                ))}
              </select>
              {loadingFunds && <p className="mt-1 text-xs text-navy-500">Loading members...</p>}
              {!loadingFunds && members.length === 0 && (
                <p className="mt-1 text-xs text-red-600">No members available. Add a member first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Fund
              </label>
              <select
                value={formData.fundId}
                onChange={(e) => setFormData({ ...formData, fundId: e.target.value })}
                required
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                <option value="">Select a fund</option>
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name}
                  </option>
                ))}
              </select>
              {loadingFunds && <p className="mt-1 text-xs text-navy-500">Loading funds...</p>}
              {!loadingFunds && funds.length === 0 && (
                <p className="mt-1 text-xs text-red-600">No funds available. Create a fund first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Amount ({code})
              </label>
              <Input
                type="number"
                min={inputMin}
                step={inputStep}
                value={formData.amountInKobo}
                onChange={(e) => setFormData({ ...formData, amountInKobo: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
              />
              <label htmlFor="recurring" className="text-sm text-navy-700">
                Recurring pledge
              </label>
            </div>
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingPledge ? 'Save Changes' : 'Create Pledge'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!payingPledge}
        onOpenChange={(value) => { if (!value) setPayingPledge(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Pledge Payment</DialogTitle>
            <DialogDescription>
              {payingPledge
                ? `${payingPledge.memberName} · ${getFundName(payingPledge.fundId)} · ${format(Number(payingPledge.remainingInKobo))} outstanding`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Amount ({code})
              </label>
              <Input
                type="number"
                min={inputMin}
                step={inputStep}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
              <p className="mt-1 text-xs text-navy-500">Entered in {symbol} ({code})</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Method</label>
                <select
                  value={payForm.type}
                  onChange={(e) => setPayForm({ ...payForm, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                >
                  {CONTRIBUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Date</label>
                <Input
                  type="date"
                  value={payForm.date}
                  onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Notes</label>
              <Input
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            {payError && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {payError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPayingPledge(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPayment}>
                {submittingPayment ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
