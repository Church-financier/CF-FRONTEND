'use client';

import { useEffect, useState } from 'react';
import { portalApi } from '@/store/usePortalStore';
import { useCurrency } from '@/hooks/useCurrency';

interface Donation {
  id: string;
  fundName: string;
  amountInKobo: string;
  date: string;
  description: string;
}

export default function PortalDonationsPage() {
  const { format, label } = useCurrency();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await portalApi<{ donations: Donation[] }>('/summary');
        setDonations(data.donations);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-navy-600">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-navy-900">Donation history</h1>
      <p className="text-xs text-navy-500">All amounts are shown in {label}.</p>
      <div className="bg-white border border-navy-200 rounded-lg overflow-hidden">
        {donations.length === 0 ? (
          <p className="px-4 py-8 text-center text-navy-500">No donations recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="bg-navy-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-navy-700">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-navy-700">Fund</th>
                  <th className="text-left px-4 py-2 font-medium text-navy-700">Description</th>
                  <th className="text-right px-4 py-2 font-medium text-navy-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-navy-600">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-navy-900">{d.fundName}</td>
                    <td className="truncate px-4 py-2 text-navy-500 max-w-xs">{d.description}</td>
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