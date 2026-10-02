'use client';

import { useEffect, useState } from 'react';
import { useBatchEntryStore } from '@/store/useBatchEntryStore';
import { useCurrency } from '@/hooks/useCurrency';
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

interface Fund {
  id: string;
  name: string;
}

interface PledgeOption {
  id: string;
  memberName: string;
  memberId: string | null;
  fundId: string;
  member?: { memberNumber: string | null } | null;
  status: string;
}

const CONTRIBUTION_TYPES = ['CASH', 'CHECK', 'ENVELOPE'] as const;

export function BatchContributionForm() {
  const { format, code, toMinorUnits, inputStep } = useCurrency();
  const { entries, addEntry, removeEntry, submitBatch, isSubmitting, getTotalKobo } =
    useBatchEntryStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [pledges, setPledges] = useState<PledgeOption[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [formData, setFormData] = useState({
    memberId: '',
    fundId: '',
    amountInKobo: '',
    type: 'CASH' as typeof CONTRIBUTION_TYPES[number],
    notes: '',
    pledgeId: '',
    date: '',
  });

  useEffect(() => {
    setFormData((current) => ({ ...current, date: current.date || new Date().toISOString().split('T')[0] }));
    setLoadingFunds(true);
    apiFetch<Fund[]>('/contributions/funds')
      .then(setFunds)
      .catch(() => setFunds([]))
      .finally(() => setLoadingFunds(false));
  }, []);

  useEffect(() => {
    if (open) {
      setLoadingFunds(true);
      apiFetch<Fund[]>('/contributions/funds')
        .then(setFunds)
        .catch(() => setFunds([]))
        .finally(() => setLoadingFunds(false));
    }
  }, [open]);

  useEffect(() => {
    apiFetch<{ data: PledgeOption[] }>('/pledges?page=1&pageSize=100')
      .then((data) => setPledges(data.data.filter((pledge) => pledge.status === 'ACTIVE')))
      .catch(() => setPledges([]));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fundId || !formData.amountInKobo) return;

    addEntry({
      memberId: formData.memberId,
      fundId: formData.fundId,
      amountInKobo: toMinorUnits(formData.amountInKobo),
      type: formData.type,
      notes: formData.notes || undefined,
      pledgeId: formData.pledgeId || undefined,
      date: formData.date,
    });

    setFormData({ memberId: '', fundId: '', amountInKobo: '', type: 'CASH', notes: '', pledgeId: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleBatchSubmit = async () => {
    try {
      setError(null);
      await submitBatch();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit batch');
    }
  };

  const getFundName = (fundId: string) => {
    const fund = funds.find((f) => f.id === fundId);
    return fund ? fund.name : 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-navy-900">Batch Contribution Entry</h3>
          <p className="text-sm text-navy-500">
            Add multiple contribution records before atomic submission
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
            Add Contribution
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Contribution Entry</DialogTitle>
              <DialogDescription>
                Record a single contribution entry to the batch
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Member ID (optional)
                </label>
                <Input
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  placeholder="Leave blank for anonymous gifts"
                />
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
                {loadingFunds && (
                  <p className="mt-1 text-xs text-navy-500">Loading funds...</p>
                )}
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
                  step={inputStep}
                  value={formData.amountInKobo}
                  onChange={(e) => setFormData({ ...formData, amountInKobo: e.target.value })}
                  placeholder={`Enter amount in ${code}`}
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
                    setFormData({ ...formData, type: e.target.value as typeof CONTRIBUTION_TYPES[number] })
                  }
                  className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                >
                  {CONTRIBUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Contribution date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Pledge installment (optional)
                </label>
                <select
                  value={formData.pledgeId}
                  onChange={(e) => setFormData({ ...formData, pledgeId: e.target.value })}
                  className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                >
                  <option value="">Not a pledge payment</option>
                  {pledges.filter((pledge) => pledge.fundId === formData.fundId && (!pledge.memberId || pledge.memberId === formData.memberId || pledge.member?.memberNumber === formData.memberId)).map((pledge) => <option key={pledge.id} value={pledge.id}>{pledge.memberName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Notes
                </label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add to Batch</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem]">
          <thead className="bg-navy-50 border-b border-navy-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Fund
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Pledge
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-navy-500">
                  No entries in batch. Click &quot;Add Contribution&quot; to begin.
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={index} className="hover:bg-navy-50">
                  <td className="px-4 py-3 text-sm text-navy-900">{entry.memberId || 'Anonymous'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{getFundName(entry.fundId)}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{entry.type}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{pledges.find((pledge) => pledge.id === entry.pledgeId)?.memberName || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-navy-900">
                    {format(entry.amountInKobo)}
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-600">{entry.date || '-'}</td>
                  <td className="px-4 py-3 text-sm text-navy-600">{entry.notes || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeEntry(index)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot className="bg-navy-50 border-t border-navy-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-navy-900">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-navy-900">
                  {format(getTotalKobo())}
                </td>
                <td colSpan={3} className="px-4 py-3 text-right">
                  <Button onClick={handleBatchSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? 'Submitting...' : 'Submit Batch'}
                  </Button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}
