'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BatchContributionForm } from '@/components/modules/contributions/BatchContributionForm';
import { ReceiptDocument, type ReceiptPayload } from '@/components/documents/ReceiptDocument';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Contribution {
  id: string;
  fundId: string;
  memberId: string | null;
  amountInKobo: string;
  description: string;
  transactionDate: string;
  contributionMethod: 'CASH' | 'CHECK' | 'ENVELOPE' | null;
  notes: string | null;
  fund?: { name: string };
  member?: { id: string; fullName: string; memberNumber: string | null } | null;
  pledgeContributions?: Array<{ pledgeId: string }>;
}

interface MemberOption {
  id: string;
  fullName: string;
  memberNumber: string | null;
}

interface FundOption { id: string; name: string }
interface PledgeOption { id: string; memberName: string; memberId: string | null; fundId: string; member?: { memberNumber: string | null } | null; status: string }

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export default function ContributionsPage() {
  return (
    <div className="space-y-6">
      <Header title="Contributions" />
      <PermissionGuard permission="contribution:create">
        <BatchContributionForm />
      </PermissionGuard>
      <RecentContributions />
    </div>
  );
}

function RecentContributions() {
  const { format, code, toMinorUnits, toInputValue, inputStep, inputMin } = useCurrency();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [pledges, setPledges] = useState<PledgeOption[]>([]);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [form, setForm] = useState({ memberId: '', fundId: '', amount: '', type: 'CASH', date: '', notes: '', pledgeId: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState('');
  // Guards: an edit or a reversal in flight is not submitted twice.
  const [saving, setSaving] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<Contribution>>('/contributions?page=1&pageSize=50');
      setContributions(data.data);
    } catch {
      setContributions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: MemberOption[] }>('/members?page=1&pageSize=100'),
      apiFetch<FundOption[]>('/contributions/funds'),
      apiFetch<{ data: PledgeOption[] }>('/pledges?page=1&pageSize=100'),
    ]).then(([memberResponse, fundResponse, pledgeResponse]) => {
      setMembers(memberResponse.data);
      setFunds(fundResponse);
      setPledges(pledgeResponse.data.filter((pledge) => pledge.status === 'ACTIVE'));
    }).catch(() => undefined);
  }, []);

  const openEdit = (contribution: Contribution) => {
    setEditing(contribution);
    setForm({
      memberId: contribution.memberId || '',
      fundId: contribution.fundId,
      amount: toInputValue(contribution.amountInKobo),
      type: contribution.contributionMethod || 'CASH',
      date: new Date(contribution.transactionDate).toISOString().slice(0, 10),
      notes: contribution.notes || '',
      pledgeId: contribution.pledgeContributions?.[0]?.pledgeId || '',
    });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || saving) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/contributions/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          memberId: form.memberId,
          fundId: form.fundId,
          amountInKobo: toMinorUnits(form.amount),
          type: form.type,
          date: form.date,
          notes: form.notes,
          pledgeId: form.pledgeId,
        }),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contribution');
    } finally {
      setSaving(false);
    }
  };

  const deleteContribution = async (contribution: Contribution) => {
    const reason = window.prompt('Reason for reversing this contribution:');
    if (!reason?.trim() || reversingId) return;
    setError(null);
    setReversingId(contribution.id);
    try {
      await apiFetch(`/contributions/${contribution.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse contribution');
    } finally {
      setReversingId(null);
    }
  };

  /**
   * Fetch the receipt document and show it in the print preview. The same
   * payload backs the PDF, so preview and download always agree.
   */
  const viewReceipt = async (id: string) => {
    setReceiptLoadingId(id);
    setError(null);
    try {
      const data = await apiFetch<ReceiptPayload>(`/contributions/${id}/receipt`);
      setPrintedAt(new Date().toISOString());
      setReceipt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-navy-900">Recent Contributions</h3>
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Contribution ({code})</DialogTitle></DialogHeader>
            <form onSubmit={saveEdit} className="space-y-3">
              <label className="block text-sm text-navy-700">Member
                <select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm">
                  <option value="">Anonymous</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}{member.memberNumber ? ` (${member.memberNumber})` : ''}</option>)}
                </select>
              </label>
              <label className="block text-sm text-navy-700">Category
                <select value={form.fundId} onChange={(event) => setForm({ ...form, fundId: event.target.value })} required className="mt-1 h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm">
                  {funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
                </select>
              </label>
              <label className="block text-sm text-navy-700">Amount ({code})
                <input aria-label={`Amount in ${code}`} type="number" min={inputMin} step={inputStep} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required className="mt-1 h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select aria-label="Payment method" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm"><option value="CASH">Cash</option><option value="CHECK">Check</option><option value="ENVELOPE">Envelope</option></select>
                <Input aria-label="Contribution date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
              </div>
              <label className="block text-sm text-navy-700">Pledge installment
                <select value={form.pledgeId} onChange={(event) => setForm({ ...form, pledgeId: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm">
                  <option value="">Not a pledge payment</option>
                  {pledges.filter((pledge) => pledge.fundId === form.fundId && (!pledge.memberId || pledge.memberId === form.memberId || pledge.member?.memberNumber === form.memberId)).map((pledge) => <option key={pledge.id} value={pledge.id}>{pledge.memberName}</option>)}
                </select>
              </label>
              <Input aria-label="Notes" placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              {error && <p className="text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && !editing && <p className="text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Fund</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {contributions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy-500">No contributions yet</td>
                </tr>
              ) : (
                contributions.map((c) => (
                  <tr key={c.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-600 whitespace-nowrap">{new Date(c.transactionDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-navy-900">{c.member?.fullName || 'Anonymous'}</td>
                    <td className="px-4 py-3 text-sm text-navy-900">{c.fund?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-navy-600 truncate max-w-md">{c.description}</td>
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium">{format(Number(c.amountInKobo))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <PermissionGuard permission="contribution:update">
                          <Button variant="outline" size="sm" onClick={() => openEdit(c)} disabled={reversingId === c.id}>Edit</Button>
                        </PermissionGuard>
                        <PermissionGuard permission="contribution:delete">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteContribution(c)}
                            disabled={reversingId === c.id}
                          >
                            {reversingId === c.id ? 'Reversing...' : 'Reverse'}
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="contribution:receipt" fallback={null}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewReceipt(c.id)}
                            disabled={receiptLoadingId === c.id}
                          >
                            {receiptLoadingId === c.id ? 'Loading...' : 'Receipt'}
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
        </div>
      )}

      <Dialog
        open={!!receipt}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          {receipt ? (
            <ReceiptDocument
              receipt={receipt}
              printedAt={printedAt}
              onClose={() => setReceipt(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
