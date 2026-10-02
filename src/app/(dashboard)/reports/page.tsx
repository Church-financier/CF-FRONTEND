'use client';

import { Header } from '@/components/layout/Header';
import { FinancialReports } from '@/components/modules/reports/FinancialReports';
import { useCurrency } from '@/hooks/useCurrency';
import { HISTORICAL_CURRENCY_NOTE } from '@/lib/currency';

export default function ReportsPage() {
  const { label, symbol } = useCurrency();

  return (
    <div className="space-y-6">
      <Header title="Financial Reports" />
      <div className="p-4 text-sm text-navy-700 bg-white border border-navy-200 rounded-lg">
        <p>
          All amounts are shown in <strong>{label}</strong> ({symbol}).
        </p>
        <p className="mt-1 text-xs text-navy-500">{HISTORICAL_CURRENCY_NOTE}</p>
      </div>
      <FinancialReports />
    </div>
  );
}
