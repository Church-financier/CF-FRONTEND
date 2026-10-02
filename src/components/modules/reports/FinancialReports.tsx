'use client';

import { useEffect, useState } from 'react';
import { useFilterStore } from '@/store/useFilterStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiDownload, apiFetch } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useAuthStore } from '@/store/useAuthStore';
import { hasPermission, isRole } from '@/lib/permissions';

interface IncomeOverview {
  weeklyContributions: string;
  monthlyContributions: string;
  ytdContributions: string;
  categories: Array<{ fundId: string; name: string; amountInKobo: string }>;
}

interface MemberStatement {
  member: { id: string; fullName: string; memberNumber: string | null };
  totalContributedInKobo: string;
  contributions: Array<{ id: string; transactionDate: string; amountInKobo: string; description: string; fund?: { name: string } }>;
}

interface MemberOption {
  id: string;
  fullName: string;
  memberNumber: string | null;
}

function IncomeReports() {
  const { format } = useCurrency();
  const [overview, setOverview] = useState<IncomeOverview | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState('');
  const [statement, setStatement] = useState<MemberStatement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<IncomeOverview>('/reports/income-overview'),
      apiFetch<{ data: MemberOption[] }>('/members?page=1&pageSize=100'),
    ]).then(([income, memberResponse]) => {
      setOverview(income);
      setMembers(memberResponse.data);
    }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load income reports'));
  }, []);

  useEffect(() => {
    if (!memberId) {
      setStatement(null);
      return;
    }
    apiFetch<MemberStatement>(`/contributions/member/${memberId}/statement`)
      .then(setStatement)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load member statement'));
  }, [memberId]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-navy-900">Income Reports</h3>
        <p className="text-sm text-navy-500">Contribution totals and member giving statements</p>
      </div>
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>}
      <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-5">
        <h4 className="text-base font-semibold text-navy-900 mb-3">Income by Category, Year to Date</h4>
        {overview?.categories.length ? (
          <div className="divide-y divide-navy-100">
            {overview.categories.map((category) => (
              <div key={category.fundId} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <span className="text-sm text-navy-700">{category.name}</span>
                <span className="text-sm font-semibold text-navy-900">{format(category.amountInKobo)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-navy-500">No income recorded this year.</p>}
      </section>
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h4 className="text-base font-semibold text-navy-900">Member Contribution Statement</h4>
          <select value={memberId} onChange={(event) => setMemberId(event.target.value)} aria-label="Select a member" className="h-9 w-full rounded-md border border-navy-300 bg-white px-3 text-sm sm:w-64 sm:min-w-0">
            <option value="">Select a member</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}{member.memberNumber ? ` (${member.memberNumber})` : ''}</option>)}
          </select>
        </div>
        {statement && (
          <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-navy-200 p-4 sm:flex-row sm:justify-between sm:gap-4">
              <span className="text-sm font-medium text-navy-900">{statement.member.fullName}</span>
              <span className="text-sm font-semibold text-navy-900">Lifetime total: {format(statement.totalContributedInKobo)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem]">
                <thead className="bg-navy-50"><tr><th className="px-4 py-2 text-left text-xs text-navy-600">Date</th><th className="px-4 py-2 text-left text-xs text-navy-600">Category</th><th className="px-4 py-2 text-left text-xs text-navy-600">Description</th><th className="px-4 py-2 text-right text-xs text-navy-600">Amount</th></tr></thead>
                <tbody className="divide-y divide-navy-100">
                  {statement.contributions.map((entry) => <tr key={entry.id}><td className="px-4 py-2 text-sm">{formatDate(entry.transactionDate)}</td><td className="px-4 py-2 text-sm">{entry.fund?.name || '-'}</td><td className="px-4 py-2 text-sm">{entry.description}</td><td className="px-4 py-2 text-sm text-right">{format(entry.amountInKobo)}</td></tr>)}
                  {statement.contributions.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-navy-500">No contributions recorded for this member.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type ReportType = 'balance-sheet' | 'statement-of-activities' | 'budget-vs-actual' | 'trial-balance' | 'cash-flow';
type ExportFormat = 'CSV' | 'XLSX' | 'PDF';

interface BalanceSheet {
  asOf: string;
  assets: Array<{ id: string; code: string; name: string; balance: string }>;
  totalAssets: string;
  liabilities: Array<{ id: string; code: string; name: string; balance: string }>;
  totalLiabilities: string;
  equity: Array<{ id: string; code: string; name: string; balance: string }>;
  totalEquity: string;
  netIncome: string;
  equityWithEarnings: string;
  totalLiabilitiesAndEquity: string;
  balanced: boolean;
}

interface StatementOfActivities {
  startDate: string | null;
  endDate: string;
  totalIncome: string;
  totalExpenses: string;
  netIncome: string;
  byFund: Array<{ fundId: string; income: string; expenses: string; net: string }>;
}

interface CashFlow {
  startDate: string | null;
  endDate: string;
  openingBalance: string;
  cashInflow: string;
  cashOutflow: string;
  netCashFlow: string;
  closingBalance: string;
}

interface TrialBalanceLine {
  accountId: string;
  accountCode: string | null;
  accountName: string | null;
  accountType: string | null;
  debitInKobo: string;
  creditInKobo: string;
  balance: string;
}

interface TrialBalance {
  lines: TrialBalanceLine[];
  totals: { debit: string; credit: string };
}

interface BudgetVsActual {
  departmentId: string;
  departmentName: string;
  fundId: string;
  fundName: string;
  fiscalYear: number;
  month: number;
  budgetedAmount: string;
  actualAmount: string;
  variance: string;
}

type ReportPreview = BalanceSheet | StatementOfActivities | CashFlow | TrialBalance | BudgetVsActual[] | { error: string };

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(date);
  }
};

function BalanceSheetPreview({ data }: { data: BalanceSheet }) {
  const { format } = useCurrency();
  const AccountRow = ({ account }: { account: { code: string; name: string; balance: string } }) => (
    <tr className="border-b border-navy-100">
      <td className="px-3 py-1.5 text-sm text-navy-600 font-mono">{account.code}</td>
      <td className="px-3 py-1.5 text-sm text-navy-800">{account.name}</td>
      <td className="px-3 py-1.5 text-sm text-navy-900 text-right font-medium">{format(account.balance)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-navy-500">As of {formatDate(data.asOf)}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h5 className="text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">Assets</h5>
          <table className="w-full min-w-[24rem]">
            <thead><tr><th className="px-3 py-1 text-left text-xs text-navy-500">Code</th><th className="px-3 py-1 text-left text-xs text-navy-500">Name</th><th className="px-3 py-1 text-right text-xs text-navy-500">Balance</th></tr></thead>
            <tbody>{data.assets.map((a) => <AccountRow key={a.id} account={a} />)}</tbody>
            <tfoot><tr className="border-t-2 border-navy-300"><td colSpan={2} className="px-3 py-1.5 text-sm font-semibold text-navy-900">Total Assets</td><td className="px-3 py-1.5 text-sm font-semibold text-navy-900 text-right">{format(data.totalAssets)}</td></tr></tfoot>
          </table>
        </div>
        <div>
          <h5 className="text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">Liabilities</h5>
          <table className="w-full min-w-[24rem]">
            <thead><tr><th className="px-3 py-1 text-left text-xs text-navy-500">Code</th><th className="px-3 py-1 text-left text-xs text-navy-500">Name</th><th className="px-3 py-1 text-right text-xs text-navy-500">Balance</th></tr></thead>
            <tbody>{data.liabilities.map((a) => <AccountRow key={a.id} account={a} />)}</tbody>
            <tfoot><tr className="border-t-2 border-navy-300"><td colSpan={2} className="px-3 py-1.5 text-sm font-semibold text-navy-900">Total Liabilities</td><td className="px-3 py-1.5 text-sm font-semibold text-navy-900 text-right">{format(data.totalLiabilities)}</td></tr></tfoot>
          </table>
        </div>
        <div>
          <h5 className="text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">Equity</h5>
          <table className="w-full min-w-[24rem]">
            <thead><tr><th className="px-3 py-1 text-left text-xs text-navy-500">Code</th><th className="px-3 py-1 text-left text-xs text-navy-500">Name</th><th className="px-3 py-1 text-right text-xs text-navy-500">Balance</th></tr></thead>
            <tbody>{data.equity.map((a) => <AccountRow key={a.id} account={a} />)}</tbody>
            <tfoot>
              <tr className="border-t border-navy-200"><td colSpan={2} className="px-3 py-1 text-sm font-medium text-navy-700">Net Income</td><td className="px-3 py-1 text-sm font-medium text-navy-700 text-right">{format(data.netIncome)}</td></tr>
              <tr><td colSpan={2} className="px-3 py-1.5 text-sm font-semibold text-navy-900">Total Equity (incl. earnings)</td><td className="px-3 py-1.5 text-sm font-semibold text-navy-900 text-right">{format(data.equityWithEarnings)}</td></tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t-2 border-navy-300 pt-2 sm:col-span-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-navy-900">Total Liabilities + Equity</span>
            <span className="text-sm font-bold text-navy-900">{format(data.totalLiabilitiesAndEquity)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-navy-500">Balanced</span>
            <span className={`text-xs font-semibold ${data.balanced ? 'text-green-700' : 'text-red-700'}`}>{data.balanced ? 'YES' : 'NO'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatementOfActivitiesPreview({ data }: { data: StatementOfActivities }) {
  const { format } = useCurrency();
  return (
    <div className="space-y-4">
      <p className="text-xs text-navy-500">{formatDate(data.startDate)} to {formatDate(data.endDate)}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center py-2 border-b border-navy-200">
          <span className="text-sm text-navy-700">Total Income (Donations + Transfers)</span>
          <span className="text-sm font-medium text-navy-900">{format(data.totalIncome)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-navy-200">
          <span className="text-sm text-navy-700">Total Expenses</span>
          <span className="text-sm font-medium text-navy-900">{format(data.totalExpenses)}</span>
        </div>
        <div className="flex justify-between items-center py-2 bg-navy-50 rounded px-2">
          <span className="text-sm font-semibold text-navy-900">Net Income</span>
          <span className="text-sm font-bold text-navy-900">{format(data.netIncome)}</span>
        </div>
      </div>
      {data.byFund.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">By Fund</h5>
          <table className="w-full min-w-[24rem]">
            <thead><tr><th className="px-3 py-1 text-left text-xs text-navy-500">Fund</th><th className="px-3 py-1 text-right text-xs text-navy-500">Income</th><th className="px-3 py-1 text-right text-xs text-navy-500">Expenses</th><th className="px-3 py-1 text-right text-xs text-navy-500">Net</th></tr></thead>
            <tbody>{data.byFund.map((f) => (
              <tr key={f.fundId} className="border-b border-navy-100">
                <td className="px-3 py-1.5 text-sm text-navy-800">{f.fundId}</td>
                <td className="px-3 py-1.5 text-sm text-navy-900 text-right">{format(f.income)}</td>
                <td className="px-3 py-1.5 text-sm text-navy-900 text-right">{format(f.expenses)}</td>
                <td className="px-3 py-1.5 text-sm text-navy-900 text-right font-medium">{format(f.net)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CashFlowPreview({ data }: { data: CashFlow }) {
  const { format } = useCurrency();
  return (
    <div className="space-y-4">
      <p className="text-xs text-navy-500">{formatDate(data.startDate)} to {formatDate(data.endDate)}</p>
      <div className="space-y-2">
        {[
          { label: 'Opening Balance', value: data.openingBalance },
          { label: 'Cash Inflow (Donations + Transfers)', value: data.cashInflow },
          { label: 'Cash Outflow (Expenses)', value: data.cashOutflow },
          { label: 'Net Cash Flow', value: data.netCashFlow, bold: true },
          { label: 'Closing Balance', value: data.closingBalance, bold: true },
        ].map((row) => (
          <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? 'bg-navy-50 rounded px-2' : 'border-b border-navy-200'}`}>
            <span className={`text-sm ${row.bold ? 'font-semibold text-navy-900' : 'text-navy-700'}`}>{row.label}</span>
            <span className={`text-sm ${row.bold ? 'font-bold text-navy-900' : 'font-medium text-navy-900'}`}>{format(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrialBalancePreview({ data }: { data: TrialBalance }) {
  const { format } = useCurrency();
  return (
    <div className="space-y-2">
      <table className="w-full min-w-[24rem]">
        <thead><tr><th className="px-3 py-1 text-left text-xs text-navy-500">Code</th><th className="px-3 py-1 text-left text-xs text-navy-500">Account</th><th className="px-3 py-1 text-left text-xs text-navy-500">Type</th><th className="px-3 py-1 text-right text-xs text-navy-500">Debit</th><th className="px-3 py-1 text-right text-xs text-navy-500">Credit</th><th className="px-3 py-1 text-right text-xs text-navy-500">Balance</th></tr></thead>
        <tbody>{data.lines.map((line) => (
          <tr key={line.accountId} className="border-b border-navy-100">
            <td className="px-3 py-1.5 text-sm text-navy-600 font-mono">{line.accountCode || '-'}</td>
            <td className="px-3 py-1.5 text-sm text-navy-800">{line.accountName || '-'}</td>
            <td className="px-3 py-1.5 text-xs text-navy-500">{line.accountType || '-'}</td>
            <td className="px-3 py-1.5 text-sm text-navy-900 text-right">{format(line.debitInKobo)}</td>
            <td className="px-3 py-1.5 text-sm text-navy-900 text-right">{format(line.creditInKobo)}</td>
            <td className="px-3 py-1.5 text-sm text-navy-900 text-right font-medium">{format(line.balance)}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr className="border-t-2 border-navy-300"><td colSpan={3} className="px-3 py-1.5 text-sm font-semibold text-navy-900">Totals</td><td className="px-3 py-1.5 text-sm font-semibold text-navy-900 text-right">{format(data.totals.debit)}</td><td className="px-3 py-1.5 text-sm font-semibold text-navy-900 text-right">{format(data.totals.credit)}</td><td className="px-3 py-1.5 text-sm font-semibold text-navy-900 text-right">-</td></tr></tfoot>
      </table>
    </div>
  );
}

function BudgetVsActualPreview({ data }: { data: unknown }) {
  const { format } = useCurrency();
  const rows: BudgetVsActual[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-2">
      <table className="w-full min-w-[24rem]">
        <thead><tr><th className="px-3 py-1 text-left text-xs text-navy-500">Department</th><th className="px-3 py-1 text-left text-xs text-navy-500">Fund</th><th className="px-3 py-1 text-left text-xs text-navy-500">Period</th><th className="px-3 py-1 text-right text-xs text-navy-500">Budgeted</th><th className="px-3 py-1 text-right text-xs text-navy-500">Actual</th><th className="px-3 py-1 text-right text-xs text-navy-500">Variance</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={`${row.departmentId}-${row.fundId}-${row.fiscalYear}-${row.month}`} className="border-b border-navy-100">
            <td className="px-3 py-1.5 text-sm text-navy-800">{row.departmentName}</td>
            <td className="px-3 py-1.5 text-sm text-navy-800">{row.fundName}</td>
            <td className="px-3 py-1.5 text-xs text-navy-500">{row.fiscalYear}-{String(row.month).padStart(2, '0')}</td>
            <td className="px-3 py-1.5 text-sm text-navy-900 text-right">{format(row.budgetedAmount)}</td>
            <td className="px-3 py-1.5 text-sm text-navy-900 text-right">{format(row.actualAmount)}</td>
            <td className={`px-3 py-1.5 text-sm text-right font-medium ${Number(row.variance) < 0 ? 'text-red-700' : 'text-navy-900'}`}>{format(row.variance)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ReportPreview({ reportType, preview }: { reportType: ReportType; preview: ReportPreview }) {
  if (preview && typeof preview === 'object' && 'error' in preview) {
    return <p className="text-sm text-red-600">{(preview as { error: string }).error}</p>;
  }

  switch (reportType) {
    case 'balance-sheet':
      return <BalanceSheetPreview data={preview as BalanceSheet} />;
    case 'statement-of-activities':
      return <StatementOfActivitiesPreview data={preview as StatementOfActivities} />;
    case 'cash-flow':
      return <CashFlowPreview data={preview as CashFlow} />;
    case 'trial-balance':
      return <TrialBalancePreview data={preview as TrialBalance} />;
    case 'budget-vs-actual':
      return <BudgetVsActualPreview data={preview as BudgetVsActual[]} />;
    default:
      return <p className="text-sm text-navy-500">Select a report type to preview.</p>;
  }
}

/**
 * Report types a department head may generate.
 *
 * The API scopes every report to the funds and departments the caller is
 * entitled to, so a department head's figures are already their own. The
 * balance-sheet style reports are excluded from their picker because they read
 * the general ledger as a whole; budget-vs-actual is the department-scoped
 * report that answers "how is my department doing?".
 */
const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: 'balance-sheet', label: 'Balance Sheet' },
  { value: 'statement-of-activities', label: 'Statement of Activities' },
  { value: 'trial-balance', label: 'Trial Balance' },
  { value: 'cash-flow', label: 'Cash Flow Statement' },
  { value: 'budget-vs-actual', label: 'Budget vs Actual' },
];

const DEPARTMENT_HEAD_REPORTS: ReportType[] = ['budget-vs-actual'];

function GeneralReports() {
  const { user } = useAuthStore();
  const isDepartmentHead = user?.role === 'DEPARTMENT_HEAD';
  const reportTypeOptions = isDepartmentHead
    ? REPORT_TYPE_OPTIONS.filter((option) => DEPARTMENT_HEAD_REPORTS.includes(option.value))
    : REPORT_TYPE_OPTIONS;
  const { fundId, startDate, endDate, setDateRange, resetFilters } = useFilterStore();
  const [reportType, setReportType] = useState<ReportType>('balance-sheet');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('CSV');
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // A department head's default report is the department-scoped one, and it
  // stays selected even if the account changes mid-session.
  const effectiveReportType = isDepartmentHead ? DEPARTMENT_HEAD_REPORTS[0] : reportType;

  const buildParams = () => {
    const p = new URLSearchParams();
    if (fundId) p.set('fundId', fundId);
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    return p;
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const data = await apiFetch<unknown>(`/reports/${effectiveReportType}?${params.toString()}`);
      setPreview(data);
    } catch (err) {
      setPreview({ error: err instanceof Error ? err.message : 'Failed to load preview' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    await loadPreview();
  };

  const handleExport = async () => {
    const params = buildParams();
    params.set('reportType', effectiveReportType);
    params.set('format', exportFormat);
    setExporting(true);
    try {
      await apiDownload(
        `/reports/export?${params.toString()}`,
        `${effectiveReportType}.${exportFormat.toLowerCase()}`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-navy-900">Financial Statements</h3>
          <p className="text-sm text-navy-500">
            {isDepartmentHead
              ? 'Reports for your department only'
              : 'Generate balance sheets, trial balances, and other reports'}
          </p>
        </div>
        <PermissionGuard permission="report:read">
          <Button onClick={handleOpen} className="w-full sm:w-auto">
            Generate Report
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <p className="text-sm text-navy-500 mb-1">Selected Report</p>
          <p className="text-xl font-semibold text-navy-900 capitalize">{effectiveReportType.replace(/-/g, ' ')}</p>
        </div>
        <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <p className="text-sm text-navy-500 mb-1">Export Format</p>
          <p className="text-xl font-semibold text-navy-900">{exportFormat}</p>
        </div>
        <div className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <p className="text-sm text-navy-500 mb-1">Date Range</p>
          <p className="text-xl font-semibold text-navy-900">
            {startDate && endDate ? `${startDate} to ${endDate}` : 'All dates'}
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate Financial Report</DialogTitle>
            <DialogDescription>Configure report parameters and export format</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Report Type</label>
                <select
                  value={effectiveReportType}
                  onChange={(e) => {
                    setReportType(e.target.value as ReportType);
                    setPreview(null);
                  }}
                  className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                >
                  {reportTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isDepartmentHead && (
                  <p className="mt-1 text-xs text-navy-500">
                    Figures are limited to the funds and departments you are assigned to.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Export Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                >
                  <option value="CSV">CSV</option>
                  <option value="XLSX">Excel (XLSX)</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate || ''}
                  onChange={(e) => setDateRange(e.target.value || null, endDate)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => setDateRange(startDate, e.target.value || null)}
                />
              </div>
            </div>

              <div className="border-t border-navy-200 pt-3">
                <div className="flex flex-col gap-2 border-t border-navy-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold text-navy-900">Preview</h4>
                  <Button variant="ghost" size="sm" onClick={loadPreview} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh Preview'}
                  </Button>
                </div>
                <div className="bg-white p-3 rounded-md text-xs overflow-auto max-h-80 border border-navy-200">
                  {preview ? <ReportPreview reportType={effectiveReportType} preview={preview as ReportPreview} /> : <p className="text-navy-500">Click &quot;Refresh Preview&quot; to load the report data.</p>}
                </div>
              </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <PermissionGuard permission="report:export" fallback={null}>
                <Button onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Exporting...' : `Export ${exportFormat}`}
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FinancialReports() {
  const { user } = useAuthStore();
  // Income reports read member contributions organization-wide, so they stay
  // with the finance roles that can see donors.
  const canViewIncome = isRole(user?.role, 'FINANCIAL_SECRETARY', 'AUDITOR');
  const canViewGeneral = hasPermission(user?.role, 'report:read');
  return (
    <>
      {canViewIncome && <IncomeReports />}
      {canViewGeneral && <GeneralReports />}
    </>
  );
}
