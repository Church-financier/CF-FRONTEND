'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Header } from '@/components/layout/Header';
import { useCurrency } from '@/hooks/useCurrency';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { hasAnyPermission, hasPermission, isRole } from '@/lib/permissions';

interface DashboardMetrics {
  totalFunds: string;
  totalContributions: string;
  totalExpenses: string;
  netIncome: string;
  cashInflow: string;
  cashOutflow: string;
  departmentBudget: string;
  pendingDisbursements: number;
  awaitingSecondApproval: number;
  awaitingPayout: number;
  recentLedger: number;
  recentContributions: number;
  activePledges: number;
  totalPledged: string;
  totalPledgeReceived: string;
  outstandingPledges: string;
  memberCount: number;
  weeklyContributions: string;
  monthlyContributions: string;
  ytdContributions: string;
  fundBalances: Array<{
    fundId: string;
    name: string;
    isRestricted: boolean;
    inflowInKobo: string;
    outflowInKobo: string;
    balanceInKobo: string;
  }>;
  memberStats: Array<{ id: string; fullName: string; memberNumber: string | null; amountInKobo: string; contributionCount: number }>;
  recentEntries: Array<{ id: string; transactionDate: string; amountInKobo: string; description: string; fund?: { name: string }; member?: { fullName: string } | null }>;
}

const DEFAULT_METRICS: DashboardMetrics = {
  totalFunds: '0',
  totalContributions: '0',
  totalExpenses: '0',
  netIncome: '0',
  cashInflow: '0',
  cashOutflow: '0',
  departmentBudget: '0',
  pendingDisbursements: 0,
  awaitingSecondApproval: 0,
  awaitingPayout: 0,
  recentLedger: 0,
  recentContributions: 0,
  activePledges: 0,
  totalPledged: '0',
  totalPledgeReceived: '0',
  outstandingPledges: '0',
  memberCount: 0,
  weeklyContributions: '0',
  monthlyContributions: '0',
  ytdContributions: '0',
  fundBalances: [],
  memberStats: [],
  recentEntries: [],
};

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
      <p className="text-sm text-navy-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-navy-900 break-words sm:text-3xl">{value}</p>
      {hint && <p className="text-xs text-navy-400 mt-1">{hint}</p>}
    </div>
  );
}

function MetricCardNumber({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
      <p className="text-sm text-navy-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-navy-900 break-words sm:text-3xl">{value}</p>
      {hint && <p className="text-xs text-navy-400 mt-1">{hint}</p>}
    </div>
  );
}

function SuperAdminDashboard({ metrics }: { metrics: DashboardMetrics }) {
  const { format } = useCurrency();
  const koboToNumber = (s: string) => Number(s || 0);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCard
          label="Total Church Balance"
          value={format(koboToNumber(metrics.totalFunds))}
        />
        <MetricCard
          label="Net Reserve"
          value={format(koboToNumber(metrics.netIncome))}
          hint="Income minus expenses"
        />
        <MetricCardNumber
          label="Pending Disbursements"
          value={metrics.pendingDisbursements}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCard
          label="Total Income"
          value={format(koboToNumber(metrics.totalContributions))}
        />
        <MetricCard
          label="Total Expenses"
          value={format(koboToNumber(metrics.totalExpenses))}
        />
        <MetricCardNumber
          label="Recent Ledger Activity"
          value={metrics.recentLedger}
          hint="Last 30 days"
        />
      </div>
    </>
  );
}

function FinancialSecretaryDashboard({ metrics }: { metrics: DashboardMetrics }) {
  const { format } = useCurrency();
  const koboToNumber = (s: string) => Number(s || 0);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCard
          label="This Week"
          value={format(koboToNumber(metrics.weeklyContributions))}
        />
        <MetricCard
          label="This Month"
          value={format(koboToNumber(metrics.monthlyContributions))}
        />
        <MetricCard
          label="Year to Date"
          value={format(koboToNumber(metrics.ytdContributions))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCardNumber
          label="Outstanding Pledges"
          value={format(koboToNumber(metrics.outstandingPledges))}
        />
        <MetricCardNumber
          label="Active Members"
          value={metrics.memberCount}
        />
        <MetricCardNumber label="Active Pledges" value={metrics.activePledges} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Recent Income</h3>
          <div className="divide-y divide-navy-100">
            {metrics.recentEntries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{entry.member?.fullName || 'Anonymous'}</p>
                  <p className="text-xs text-navy-500">{entry.fund?.name || 'Income'} · {new Date(entry.transactionDate).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-navy-900 whitespace-nowrap">{format(Number(entry.amountInKobo))}</span>
              </div>
            ))}
            {metrics.recentEntries.length === 0 && <p className="py-4 text-sm text-navy-500">No income entries recorded.</p>}
          </div>
        </section>
        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Member Contributions YTD</h3>
          <div className="divide-y divide-navy-100">
            {metrics.memberStats.slice(0, 6).map((member) => (
              <div key={member.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{member.fullName}</p>
                  <p className="text-xs text-navy-500">{member.contributionCount} contributions</p>
                </div>
                <span className="text-sm font-semibold text-navy-900 whitespace-nowrap">{format(Number(member.amountInKobo))}</span>
              </div>
            ))}
            {metrics.memberStats.length === 0 && <p className="py-4 text-sm text-navy-500">No member-linked contributions this year.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

function TreasurerDashboard({ metrics }: { metrics: DashboardMetrics }) {
  const { format } = useCurrency();
  const koboToNumber = (s: string) => Number(s || 0);
  const accounts = metrics.fundBalances ?? [];
  const netCashFlow = koboToNumber(metrics.cashInflow) - koboToNumber(metrics.cashOutflow);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCard
          label="Total Organization Balance"
          value={format(koboToNumber(metrics.totalFunds))}
          hint="Cash held across all accounts"
        />
        <MetricCard
          label="Cash Inflow"
          value={format(koboToNumber(metrics.cashInflow))}
          hint="Donations and transfers received"
        />
        <MetricCard
          label="Cash Outflow"
          value={format(koboToNumber(metrics.cashOutflow))}
          hint="Expenses and disbursements paid"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCardNumber
          label="Pending Disbursement Approvals"
          value={metrics.pendingDisbursements}
          hint={`${metrics.awaitingSecondApproval} awaiting final approval`}
        />
        <MetricCardNumber
          label="Approved, Awaiting Payout"
          value={metrics.awaitingPayout}
          hint="Ready to release funds"
        />
        <MetricCard
          label="Net Cash Flow"
          value={format(netCashFlow)}
          hint="Inflow minus outflow"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Bank Account Breakdown</h3>
          {accounts.length === 0 ? (
            <p className="py-4 text-sm text-navy-500">No accounts configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem]">
                <thead>
                  <tr className="border-b border-navy-200">
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">
                      Account
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-navy-500">
                      Inflow
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-navy-500">
                      Outflow
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-navy-500">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {accounts.map((account) => (
                    <tr key={account.fundId}>
                      <td className="px-2 py-2.5 text-sm text-navy-900">
                        {account.name}
                        {account.isRestricted && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            Restricted
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-sm text-navy-700 text-right">
                        {format(koboToNumber(account.inflowInKobo))}
                      </td>
                      <td className="px-2 py-2.5 text-sm text-navy-700 text-right">
                        {format(koboToNumber(account.outflowInKobo))}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-sm font-semibold text-right ${
                          koboToNumber(account.balanceInKobo) < 0 ? 'text-red-700' : 'text-navy-900'
                        }`}
                      >
                        {format(koboToNumber(account.balanceInKobo))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy-300">
                    <td className="px-2 py-2 text-sm font-semibold text-navy-900">Total</td>
                    <td className="px-2 py-2 text-sm font-semibold text-navy-900 text-right">
                      {format(koboToNumber(metrics.cashInflow))}
                    </td>
                    <td className="px-2 py-2 text-sm font-semibold text-navy-900 text-right">
                      {format(koboToNumber(metrics.cashOutflow))}
                    </td>
                    <td className="px-2 py-2 text-sm font-bold text-navy-900 text-right">
                      {format(koboToNumber(metrics.totalFunds))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Cash Flow Summary</h3>
          <div className="space-y-2">
            {[
              { label: 'Total inflow received', value: koboToNumber(metrics.cashInflow) },
              { label: 'Total outflow disbursed', value: -koboToNumber(metrics.cashOutflow) },
              { label: 'Net cash flow', value: netCashFlow, bold: true },
            ].map((row) => (
              <div
                key={row.label}
                className={`flex justify-between items-center py-2 ${
                  row.bold ? 'bg-navy-50 rounded px-2' : 'border-b border-navy-200'
                }`}
              >
                <span className={`text-sm ${row.bold ? 'font-semibold text-navy-900' : 'text-navy-700'}`}>
                  {row.label}
                </span>
                <span
                  className={`text-sm ${
                    row.bold ? 'font-bold' : 'font-medium'
                  } ${row.value < 0 ? 'text-red-700' : 'text-navy-900'}`}
                >
                  {format(row.value)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-navy-700">Ledger activity (30 days)</span>
              <span className="text-sm font-medium text-navy-900">{metrics.recentLedger}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-navy-700">Active members</span>
              <span className="text-sm font-medium text-navy-900">{metrics.memberCount}</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function DepartmentHeadDashboard({ metrics }: { metrics: DashboardMetrics }) {
  const { format } = useCurrency();
  const koboToNumber = (s: string) => Number(s || 0);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        <MetricCard
          label="Assigned Department Budget"
          value={format(koboToNumber(metrics.departmentBudget))}
          hint="FY budget allocation"
        />
        <MetricCard
          label="Department Expenses YTD"
          value={format(koboToNumber(metrics.totalExpenses))}
        />
        <MetricCardNumber
          label="Pending Unit Requests"
          value={metrics.pendingDisbursements}
          hint="For your department"
        />
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadMetrics() {
      try {
        const endpoint = isRole(user?.role, 'FINANCIAL_SECRETARY')
          ? '/reports/income-overview'
          : '/reports/metrics';
        const data = await apiFetch<DashboardMetrics>(endpoint);
        setMetrics(data);
      } catch {
        setMetrics(DEFAULT_METRICS);
      }
    }
    loadMetrics();
  }, [user?.role]);

  if (!user) return null;

  const role = user.role;
  let dashboardTitle = 'Dashboard';
  let dashboardComponent: React.ReactNode = null;

  if (isRole(role, 'SUPER_ADMIN')) {
    dashboardTitle = 'Executive Financial Dashboard';
    dashboardComponent = <SuperAdminDashboard metrics={metrics || DEFAULT_METRICS} />;
  } else if (isRole(role, 'FINANCIAL_SECRETARY')) {
    dashboardTitle = 'Income Overview';
    dashboardComponent = <FinancialSecretaryDashboard metrics={metrics || DEFAULT_METRICS} />;
  } else if (isRole(role, 'TREASURER')) {
    dashboardTitle = 'Financial & Cash Flow Dashboard';
    dashboardComponent = <TreasurerDashboard metrics={metrics || DEFAULT_METRICS} />;
  } else if (isRole(role, 'DEPARTMENT_HEAD')) {
    dashboardTitle = 'Department Dashboard';
    dashboardComponent = <DepartmentHeadDashboard metrics={metrics || DEFAULT_METRICS} />;
  } else if (isRole(role, 'AUDITOR')) {
    dashboardTitle = 'Audit Dashboard';
    dashboardComponent = <SuperAdminDashboard metrics={metrics || DEFAULT_METRICS} />;
  }

  return (
    <div className="space-y-6">
      <Header title={dashboardTitle} />

      <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-navy-900 mb-4">
          Welcome, {user?.name || 'User'}
        </h3>
        <p className="text-navy-600 mb-4 text-sm sm:text-base">
          You are logged in as{' '}
          <span className="font-medium">{user?.role?.replace(/_/g, ' ') || 'User'}</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {hasPermission(role, 'contribution:create') && (
            <Button onClick={() => router.push('/contributions')} className="w-full sm:w-auto">
              Record Contributions
            </Button>
          )}
          {hasPermission(role, 'disbursement:create') && (
            <Button
              variant="outline"
              onClick={() => router.push('/disbursements')}
              className="w-full sm:w-auto"
            >
              View Disbursements
            </Button>
          )}
          {hasAnyPermission(role, ['report:read', 'report:income']) && (
            <Button
              variant="outline"
              onClick={() => router.push('/reports')}
              className="w-full sm:w-auto"
            >
              View Reports
            </Button>
          )}
        </div>
      </div>

      {dashboardComponent}
    </div>
  );
}
