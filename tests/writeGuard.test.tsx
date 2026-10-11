import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/store/useAuthStore';
import { WriteGuard } from '@/components/PermissionGuard';
import type { Role } from '@/lib/permissions';

/** Puts the store into a signed-in state for the given role. */
function signInAs(role: Role) {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'a@b.com',
      name: 'Test User',
      role,
      organizationId: 'o1',
      organizationName: 'Test Church',
    },
    isAuthenticated: true,
    isLoading: false,
  });
}

function signOut() {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
}

const WRITE_PERMISSIONS = [
  'pledge:create',
  'pledge:update',
  'pledge:delete',
  'member:create',
  'member:update',
  'member:delete',
  'vendor:create',
  'vendor:update',
  'vendor:delete',
  'department:create',
  'department:update',
  'department:delete',
  'budget:create',
  'budget:update',
  'budget:delete',
] as const;

describe('WriteGuard', () => {
  it('renders no write control at all for an auditor', () => {
    signInAs('AUDITOR');
    for (const permission of WRITE_PERMISSIONS) {
      const { unmount } = render(
        <WriteGuard permission={permission}>
          <button>Mutate</button>
        </WriteGuard>
      );
      expect(screen.queryByRole('button', { name: 'Mutate' }), permission).toBeNull();
      unmount();
    }
  });

  it('honours the fallback rather than dropping it silently', () => {
    signInAs('AUDITOR');
    render(
      <WriteGuard permission="member:create" fallback={<span>Read-only</span>}>
        <button>Add Member</button>
      </WriteGuard>
    );
    expect(screen.queryByRole('button', { name: 'Add Member' })).toBeNull();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
  });

  it('still renders write controls for roles that hold the permission', () => {
    signInAs('SUPER_ADMIN');
    for (const permission of WRITE_PERMISSIONS) {
      const { unmount } = render(
        <WriteGuard permission={permission}>
          <button>Mutate</button>
        </WriteGuard>
      );
      expect(screen.getByRole('button', { name: 'Mutate' }), permission).toBeInTheDocument();
      unmount();
    }
  });

  it('withholds a control the role does not hold even without a read-only role', () => {
    // DEPARTMENT_HEAD may update a budget but may not delete one.
    signInAs('DEPARTMENT_HEAD');
    const { rerender } = render(
      <WriteGuard permission="budget:update">
        <button>Edit</button>
      </WriteGuard>
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    rerender(
      <WriteGuard permission="budget:delete">
        <button>Delete</button>
      </WriteGuard>
    );
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('accepts a role allowlist for actions with no dedicated permission', () => {
    // Period locking is gated by role alone: POST /periods/lock allows
    // SUPER_ADMIN and TREASURER only.
    signInAs('AUDITOR');
    const { unmount } = render(
      <WriteGuard allowedRoles={['SUPER_ADMIN', 'TREASURER']}>
        <button>Lock Period</button>
      </WriteGuard>
    );
    expect(screen.queryByRole('button', { name: 'Lock Period' })).toBeNull();
    unmount();

    signInAs('TREASURER');
    render(
      <WriteGuard allowedRoles={['SUPER_ADMIN', 'TREASURER']}>
        <button>Lock Period</button>
      </WriteGuard>
    );
    expect(screen.getByRole('button', { name: 'Lock Period' })).toBeInTheDocument();
  });

  it('gates on any-of when given several permissions, as the create/edit dialogs do', () => {
    signInAs('AUDITOR');
    const { unmount } = render(
      <WriteGuard permissions={['vendor:create', 'vendor:update']}>
        <button>Save Vendor</button>
      </WriteGuard>
    );
    expect(screen.queryByRole('button', { name: 'Save Vendor' })).toBeNull();
    unmount();

    signInAs('FINANCIAL_SECRETARY');
    render(
      <WriteGuard permissions={['vendor:create', 'vendor:update']}>
        <button>Save Vendor</button>
      </WriteGuard>
    );
    // The secretary may read vendors only, so neither verb opens the dialog.
    expect(screen.queryByRole('button', { name: 'Save Vendor' })).toBeNull();
  });

  it('renders nothing for a signed-out visitor', () => {
    signOut();
    render(
      <WriteGuard permission="pledge:create">
        <button>Add Pledge</button>
      </WriteGuard>
    );
    expect(screen.queryByRole('button', { name: 'Add Pledge' })).toBeNull();
  });
});