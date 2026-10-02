import { Role } from '@/lib/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiredPermission?: string;
  requiredAnyPermission?: string[];
  requiredRole?: Role[];
  children?: NavItem[];
}

export const navigationItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', requiredPermission: undefined },
  { href: '/funds', label: 'Funds', icon: 'Wallet', requiredPermission: 'fund:read' },
  { href: '/chart-of-accounts', label: 'Chart of Accounts', icon: 'Calculator', requiredPermission: 'chart-of-accounts:read' },
  { href: '/ledger', label: 'General Ledger', icon: 'BookOpen', requiredPermission: 'ledger:read' },
  { href: '/contributions', label: 'Contributions', icon: 'HandCoins', requiredPermission: 'contribution:read' },
  { href: '/disbursements', label: 'Disbursements', icon: 'Receipt', requiredPermission: 'disbursement:read' },
  { href: '/pledges', label: 'Pledges', icon: 'Heart', requiredPermission: 'pledge:read' },
  { href: '/members', label: 'Members', icon: 'UserPlus', requiredPermission: 'member:read' },
  { href: '/vendors', label: 'Vendors', icon: 'Store', requiredPermission: 'vendor:read' },
  { href: '/departments', label: 'Departments', icon: 'Building2', requiredPermission: 'department:read', requiredRole: ['SUPER_ADMIN', 'AUDITOR'] },
  // Organisation-wide budget allocation is not a department head's concern;
  // they work inside their own budget at /department/budget instead.
  { href: '/budgets', label: 'Budgets', icon: 'Target', requiredPermission: 'budget:read', requiredRole: ['SUPER_ADMIN', 'TREASURER', 'AUDITOR'] },
  { href: '/department/budget', label: 'Department Budget', icon: 'Target', requiredPermission: 'budget:read', requiredRole: ['DEPARTMENT_HEAD'] },
  { href: '/reports', label: 'Reports', icon: 'FileText', requiredAnyPermission: ['report:read', 'report:income'] },
];

export const adminNavItems: NavItem[] = [
  { href: '/users', label: 'Users', icon: 'Users', requiredRole: ['SUPER_ADMIN'] },
  { href: '/audit', label: 'Audit Logs', icon: 'History', requiredPermission: 'audit:read' },
  { href: '/periods', label: 'Periods', icon: 'Lock', requiredRole: ['SUPER_ADMIN', 'TREASURER', 'AUDITOR'] },
  { href: '/finance/master-budget', label: 'Master Budget', icon: 'Target', requiredPermission: 'budget:read', requiredRole: ['SUPER_ADMIN', 'TREASURER'] },
  { href: '/system/settings', label: 'System Settings', icon: 'Settings', requiredRole: ['SUPER_ADMIN'] },
];
