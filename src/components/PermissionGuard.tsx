'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { ReactNode } from 'react';
import { hasPermission, isRole, Role } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type RequiredPermissions = string | string[];
type RequiredRoles = Role | Role[];

interface PermissionGuardProps {
  allowedRoles?: RequiredRoles;
  permission?: RequiredPermissions;
  permissions?: RequiredPermissions[];
  children: ReactNode;
  fallback?: ReactNode;
  redirect?: boolean;
}

export function hasPermissionFromStore(role: Role | undefined | null, permission: string): boolean {
  return hasPermission(role, permission);
}

export function hasAnyPermissionFromStore(role: Role | undefined | null, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export const DISBURSEMENT_APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'TREASURER'];

export function canApproveDisbursement(role: Role | undefined | null): boolean {
  return !!role && DISBURSEMENT_APPROVER_ROLES.includes(role) && hasPermission(role, 'disbursement:approve');
}

export function canRejectDisbursement(role: Role | undefined | null): boolean {
  return hasPermission(role, 'disbursement:reject');
}

export function canCreateDisbursement(role: Role | undefined | null): boolean {
  return hasPermission(role, 'disbursement:create');
}

function checkRole(role: Role | undefined | null, allowedRoles?: RequiredRoles): boolean {
  if (!allowedRoles) return true;
  if (Array.isArray(allowedRoles)) {
    return isRole(role, ...allowedRoles);
  }
  return role === allowedRoles;
}

function checkPermission(role: Role | undefined | null, permission?: RequiredPermissions): boolean {
  if (!permission) return true;
  if (Array.isArray(permission)) {
    return hasAnyPermissionFromStore(role, permission);
  }
  return hasPermission(role, permission);
}

function checkPermissions(role: Role | undefined | null, permissions?: RequiredPermissions[]): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((p) => checkPermission(role, p));
}

export function PermissionGuard({
  allowedRoles,
  permission,
  permissions,
  children,
  fallback = null,
  redirect = true,
}: PermissionGuardProps) {
  const { user } = useAuthStore();

  useEffect(() => {
    if (redirect && user && !checkRole(user.role, allowedRoles)) {
      return;
    }
  }, [user, redirect, allowedRoles]);

  if (!user) {
    return <>{fallback}</>;
  }

  const roleMatch = checkRole(user.role, allowedRoles);
  const permMatch = checkPermission(user.role, permission);
  const permsMatch = checkPermissions(user.role, permissions);

  if (!roleMatch || (!permMatch && !permsMatch)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function RouteGuard({
  requiredPermission,
  requiredRoles,
  children,
  fallback,
}: {
  requiredPermission?: string;
  requiredRoles?: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (requiredRoles && !isRole(user.role, ...requiredRoles)) {
      if (requiredPermission && hasPermission(user.role, requiredPermission)) {
        return;
      }
      router.push('/unauthorized');
      return;
    }

    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
      router.push('/unauthorized');
      return;
    }
  }, [user, requiredPermission, requiredRoles, router]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-navy-50">Loading…</div>;
  }

  if (requiredRoles && !isRole(user.role, ...requiredRoles)) {
    return <>{fallback || <UnauthorizedFallback />}</>;
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return <>{fallback || <UnauthorizedFallback />}</>;
  }

  return <>{children}</>;
}

function UnauthorizedFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold text-navy-900">403 - Unauthorized</h2>
      <p className="text-navy-500 mt-2">You do not have permission to access this page.</p>
    </div>
  );
}

export { isRole, hasPermission, hasAnyPermissionFromStore as hasAnyPermission };
