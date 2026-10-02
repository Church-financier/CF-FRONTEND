'use client';

import { useEffect, useState } from 'react';
import { portalApi } from '@/store/usePortalStore';
import { useCurrency } from '@/hooks/useCurrency';

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

export default function PortalPledgesPage() {
  const { format, label } = useCurrency();
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await portalApi<{ pledges: Pledge[] }>('/summary');
        setPledges(data.pledges);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-navy-600">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-navy-900">My pledges</h1>
      <p className="text-xs text-navy-500">All amounts are shown in {label}.</p>
      {pledges.length === 0 ? (
        <div className="bg-white border border-navy-200 rounded-lg p-8 text-center text-navy-500">
          You have no pledges on record.
        </div>
      ) : (
        <div className="space-y-3">
          {pledges.map((p) => (
            <div key={p.id} className="bg-white border border-navy-200 rounded-lg p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{p.fundName}</p>
                  <p className="text-xs text-navy-500">
                    Status: <span className="font-medium">{p.status}</span>
                    {p.startDate ? ` • Started ${new Date(p.startDate).toLocaleDateString()}` : ''}
                    {p.endDate ? ` • Ends ${new Date(p.endDate).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <p className="text-navy-900 sm:text-right">
                  <span className="font-semibold">{format(p.fulfilledInKobo)}</span>
                  <span className="text-navy-500"> / {format(p.amountInKobo)}</span>
                </p>
              </div>
              <div className="mt-3 h-2 bg-navy-100 rounded overflow-hidden">
                <div className="h-full bg-gold-500" style={{ width: `${Math.min(100, p.progress)}%` }} />
              </div>
              <p className="mt-2 text-xs text-navy-500">
                {p.progress.toFixed(1)}% complete • {format(p.remainingInKobo)} remaining
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}