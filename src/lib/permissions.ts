export type Role = 'SUPER_ADMIN' | 'TREASURER' | 'FINANCIAL_SECRETARY' | 'AUDITOR' | 'DEPARTMENT_HEAD';

export const ROLES: Role[] = [
  'SUPER_ADMIN',
  'TREASURER',
  'FINANCIAL_SECRETARY',
  'AUDITOR',
  'DEPARTMENT_HEAD',
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  TREASURER: 'Treasurer',
  FINANCIAL_SECRETARY: 'Financial Secretary',
  AUDITOR: 'Auditor',
  DEPARTMENT_HEAD: 'Department Head',
};

/**
 * Must stay identical to `PERMISSIONS` in
 * `backend/src/middleware/rbacMiddleware.ts`; the backend test suite asserts
 * the Treasurer matrix.
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    'fund:create', 'fund:read', 'fund:update', 'fund:delete',
    'ledger:create', 'ledger:read', 'ledger:reverse',
    'disbursement:create', 'disbursement:read', 'disbursement:approve', 'disbursement:reject',
    'report:export', 'report:read', 'report:income',
    'user:manage',
    'audit:read',
    'pledge:create', 'pledge:read', 'pledge:update', 'pledge:delete',
    'contribution:read', 'contribution:batch', 'contribution:create', 'contribution:update', 'contribution:delete', 'contribution:receipt',
    'chart-of-accounts:create', 'chart-of-accounts:read', 'chart-of-accounts:update', 'chart-of-accounts:delete',
    'vendor:create', 'vendor:read', 'vendor:update', 'vendor:delete',
    'department:create', 'department:read', 'department:update', 'department:delete',
    'member:create', 'member:read', 'member:update', 'member:delete',
    'budget:create', 'budget:read', 'budget:update', 'budget:delete',
  ],
  TREASURER: [
    'fund:create', 'fund:read', 'fund:update', 'fund:delete',
    'ledger:read',
    'disbursement:create', 'disbursement:read', 'disbursement:approve', 'disbursement:reject',
    'chart-of-accounts:create', 'chart-of-accounts:read', 'chart-of-accounts:update', 'chart-of-accounts:delete',
    'budget:create', 'budget:read', 'budget:update', 'budget:delete',
    'report:read', 'report:export',
    'vendor:create', 'vendor:read', 'vendor:update', 'vendor:delete',
    // Read-only: the budget builder, master budget and disbursement forms all
    // need the department directory to populate their selectors.
    'department:read',
    'member:create', 'member:read', 'member:update', 'member:delete',
    'contribution:read', 'contribution:batch', 'contribution:create', 'contribution:update', 'contribution:delete', 'contribution:receipt',
    'pledge:create', 'pledge:read', 'pledge:update', 'pledge:delete',
  ],
  FINANCIAL_SECRETARY: [
    'member:create', 'member:read', 'member:update', 'member:delete',
    'contribution:read', 'contribution:batch', 'contribution:create', 'contribution:update', 'contribution:delete', 'contribution:receipt',
    'pledge:create', 'pledge:read', 'pledge:update', 'pledge:delete',
    'vendor:read',
    'report:income',
  ],
  AUDITOR: [
    'fund:read',
    'ledger:read',
    'disbursement:read',
    'report:read', 'report:export', 'report:income',
    'member:read',
    'contribution:read', 'contribution:receipt',
    'pledge:read',
    'chart-of-accounts:read',
    'budget:read',
    'vendor:read',
    'department:read',
    'audit:read',
  ],
  DEPARTMENT_HEAD: [
    'disbursement:create',
    'disbursement:read',
    'budget:create', 'budget:read', 'budget:update',
    'report:read',
    'department:read',
  ],
};

export function hasPermission(role: Role | undefined | null, permission: string): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role | undefined | null, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role | undefined | null, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function isRole(role: Role | undefined | null, ...roles: Role[]): boolean {
  if (!role) return false;
  return roles.includes(role);
}

export const DISBURSEMENT_APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'TREASURER'];

export function canApproveDisbursement(role: Role | undefined | null): boolean {
  return isRole(role, ...DISBURSEMENT_APPROVER_ROLES) && hasPermission(role, 'disbursement:approve');
}

export function canRejectDisbursement(role: Role | undefined | null): boolean {
  return hasPermission(role, 'disbursement:reject');
}

export function canCreateDisbursement(role: Role | undefined | null): boolean {
  return hasPermission(role, 'disbursement:create');
}

export const DASHBOARD_ROUTE = '/dashboard';
export const SETTINGS_ROUTE = '/settings';

export function getAccessibleRoutes(role: Role | undefined | null): string[] {
  if (!role) return [];
  const routes: string[] = [DASHBOARD_ROUTE, SETTINGS_ROUTE];

  if (hasAnyPermission(role, ['fund:read'])) routes.push('/funds');
  if (hasAnyPermission(role, ['chart-of-accounts:read'])) routes.push('/chart-of-accounts');
  if (hasAnyPermission(role, ['ledger:read'])) routes.push('/ledger');
  if (hasAnyPermission(role, ['contribution:read'])) routes.push('/contributions');
  if (hasAnyPermission(role, ['disbursement:read'])) routes.push('/disbursements');
  if (hasAnyPermission(role, ['pledge:read'])) routes.push('/pledges');
  if (hasAnyPermission(role, ['member:read'])) routes.push('/members');
  if (hasAnyPermission(role, ['vendor:read'])) routes.push('/vendors');
  if (hasAnyPermission(role, ['department:read']) && isRole(role, 'SUPER_ADMIN', 'AUDITOR')) routes.push('/departments');
  // Organisation-wide budget allocation stays with the finance roles; a
  // department head works only inside their own /department/budget.
  if (hasAnyPermission(role, ['budget:read']) && isRole(role, 'SUPER_ADMIN', 'TREASURER', 'AUDITOR')) {
    routes.push('/budgets');
  }
  if (hasAnyPermission(role, ['report:read', 'report:income'])) routes.push('/reports');
  if (hasAnyPermission(role, ['audit:read'])) routes.push('/audit');
  if (isRole(role, 'SUPER_ADMIN', 'TREASURER', 'AUDITOR')) routes.push('/periods');
  if (isRole(role, 'SUPER_ADMIN')) routes.push('/users');
  if (isRole(role, 'SUPER_ADMIN')) routes.push('/system/settings');
  if (hasAnyPermission(role, ['budget:read']) && isRole(role, 'SUPER_ADMIN', 'TREASURER')) {
    routes.push('/finance/master-budget');
  }
  if (hasAnyPermission(role, ['budget:read']) && isRole(role, 'DEPARTMENT_HEAD')) {
    routes.push('/department/budget');
  }

  return routes;
}
