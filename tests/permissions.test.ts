import { describe, expect, it } from 'vitest';
import {
  READ_ONLY_ROLES,
  ROLES,
  canWrite,
  canWriteAny,
  getAccessibleRoutes,
  hasPermission,
  isAuditor,
  isReadOnlyRole,
} from '@/lib/permissions';

describe('read-only role helpers', () => {
  it('treats AUDITOR as read-only and nothing else', () => {
    expect(READ_ONLY_ROLES).toContain('AUDITOR');
    expect(isReadOnlyRole('AUDITOR')).toBe(true);
    expect(isAuditor('AUDITOR')).toBe(true);

    for (const role of ROLES.filter((r) => r !== 'AUDITOR')) {
      expect(isReadOnlyRole(role)).toBe(false);
      expect(isAuditor(role)).toBe(false);
    }

    expect(isReadOnlyRole(undefined)).toBe(false);
    expect(isReadOnlyRole(null)).toBe(false);
    expect(isReadOnlyRole('GUEST' as never)).toBe(false);
  });
});

describe('canWrite', () => {
  it('never grants a write to AUDITOR, whatever the permission matrix says', () => {
    const writeVerbs = [
      'fund:create', 'fund:update', 'fund:delete',
      'ledger:create', 'ledger:reverse',
      'disbursement:create', 'disbursement:approve', 'disbursement:reject',
      'contribution:create', 'contribution:batch', 'contribution:update', 'contribution:delete',
      'pledge:create', 'pledge:update', 'pledge:delete',
      'chart-of-accounts:create', 'chart-of-accounts:update', 'chart-of-accounts:delete',
      'budget:create', 'budget:update', 'budget:delete',
      'vendor:create', 'vendor:update', 'vendor:delete',
      'department:create', 'department:update', 'department:delete',
      'member:create', 'member:update', 'member:delete',
      'user:manage',
    ];
    for (const permission of writeVerbs) {
      expect(canWrite('AUDITOR', permission), permission).toBe(false);
      expect(canWriteAny('AUDITOR', [permission]), permission).toBe(false);
    }
  });

  it('keeps every read open to AUDITOR', () => {
    const reads = [
      'fund:read', 'ledger:read', 'disbursement:read',
      'report:read', 'report:export', 'report:income',
      'member:read', 'contribution:read', 'contribution:receipt',
      'pledge:read', 'chart-of-accounts:read', 'budget:read',
      'vendor:read', 'department:read', 'audit:read',
    ];
    for (const permission of reads) {
      expect(hasPermission('AUDITOR', permission), permission).toBe(true);
      expect(canWrite('AUDITOR', permission), permission).toBe(false);
    }
  });

  it('mirrors the backend matrix for roles that do write', () => {
    expect(canWrite('SUPER_ADMIN', 'budget:create')).toBe(true);
    expect(canWrite('TREASURER', 'member:delete')).toBe(true);
    expect(canWrite('FINANCIAL_SECRETARY', 'pledge:create')).toBe(true);
    expect(canWrite('DEPARTMENT_HEAD', 'budget:update')).toBe(true);

    // Wrong verb stays wrong: creating does not imply deleting.
    expect(canWrite('DEPARTMENT_HEAD', 'budget:delete')).toBe(false);
    expect(canWrite('TREASURER', 'department:create')).toBe(false);
  });

  it('is false for a missing role or an unknown one', () => {
    expect(canWrite(undefined, 'member:create')).toBe(false);
    expect(canWrite(null, 'member:create')).toBe(false);
    expect(canWrite('GUEST' as never, 'member:create')).toBe(false);
    expect(canWriteAny(undefined, ['member:create'])).toBe(false);
  });

  it('reports true for canWriteAny when at least one verb is permitted', () => {
    expect(canWriteAny('SUPER_ADMIN', ['budget:update', 'budget:delete'])).toBe(true);
    expect(canWriteAny('TREASURER', ['department:update', 'department:delete'])).toBe(false);
    expect(canWriteAny('AUDITOR', [])).toBe(false);
  });
});

describe('auditor navigation', () => {
  it('retains access to the standard read-only modules', () => {
    const routes = getAccessibleRoutes('AUDITOR');
    for (const route of [
      '/dashboard',
      '/pledges',
      '/members',
      '/vendors',
      '/departments',
      '/budgets',
      '/reports',
      '/audit',
      '/periods',
      '/funds',
      '/ledger',
      '/contributions',
      '/disbursements',
      '/chart-of-accounts',
    ]) {
      expect(routes, route).toContain(route);
    }
  });

  it('is kept out of the administrative modules', () => {
    const routes = getAccessibleRoutes('AUDITOR');
    expect(routes).not.toContain('/users');
    expect(routes).not.toContain('/system/settings');
    expect(routes).not.toContain('/finance/master-budget');
  });
});