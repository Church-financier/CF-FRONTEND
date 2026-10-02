'use client';

import { useEffect, useState } from 'react';
import { portalApi } from '@/store/usePortalStore';
import { useCurrency } from '@/hooks/useCurrency';

interface Summary {
  totalDonated: string;
  totalPledged: string;
  totalFulfilled: string;
  activePledges: number;
  donationCount: number;
}

interface Pledge {
  id: string;
  fundName: string;
  amountInKobo: string;
  fulfilledInKobo: string;
  remainingInKobo: string;
  status: string;
  progress: number;
  startDate?: string | null;
  endDate?: string | null;
}

interface Donation {
  id: string;
  fundName: string;
  amountInKobo: string;
  date: string;
  description: string;
}

export default function PortalDashboardPage() {
  const { format, label } = useCurrency();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await portalApi<{ summary: Summary; pledges: Pledge[]; donations: Donation[] }>('/summary');
        setSummary(data.summary);
        setPledges(data.pledges);
        setDonations(data.donations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-navy-600">Loading…</div>;
  if (error) return <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>;
  if (!summary) return null;

  const cards = [
    { label: 'Total donated', value: format(summary.totalDonated) },
    { label: 'Total pledged', value: format(summary.totalPledged) },
    { label: 'Fulfilled', value: format(summary.totalFulfilled) },
    { label: 'Donations', value: String(summary.donationCount) },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-navy-500">All amounts are shown in {label}.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-navy-200 rounded-lg p-4">
            <p className="text-xs text-navy-500 uppercase tracking-wide">{c.label}</p>
            <p className="mt-1 text-lg font-semibold text-navy-900 break-words">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-navy-200 rounded-lg">
        <div className="px-4 py-3 border-b border-navy-200 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Active pledges</h2>
          <span className="text-xs text-navy-500">{summary.activePledges} active</span>
        </div>
        {pledges.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-navy-500">No pledges on record.</p>
        ) : (
          <ul className="divide-y divide-navy-200">
            {pledges.slice(0, 5).map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-navy-900">{p.fundName}</span>
                  <span className="text-navy-600">{format(p.fulfilledInKobo)} / {format(p.amountInKobo)}</span>
                </div>
                <div className="mt-2 h-2 bg-navy-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-gold-500"
                    style={{ width: `${Math.min(100, p.progress)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-navy-200 rounded-lg">
        <div className="px-4 py-3 border-b border-navy-200">
          <h2 className="font-semibold text-navy-900">Recent donations</h2>
        </div>
        {donations.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-navy-500">No donations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <thead className="bg-navy-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-navy-700">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-navy-700">Fund</th>
                  <th className="text-right px-4 py-2 font-medium text-navy-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {donations.slice(0, 5).map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-navy-600">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-navy-900">{d.fundName}</td>
                    <td className="px-4 py-2 text-right font-medium text-navy-900">{format(d.amountInKobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}