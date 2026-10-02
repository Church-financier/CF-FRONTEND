'use client';

import { ReactNode, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
import { getAccessibleRoutes, DASHBOARD_ROUTE } from '@/lib/permissions';

function normalizePathname(pathname: string): string {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (normalized === DASHBOARD_ROUTE) return DASHBOARD_ROUTE;
  if (normalized.startsWith(`${DASHBOARD_ROUTE}/`)) {
    return normalized.slice(DASHBOARD_ROUTE.length) || DASHBOARD_ROUTE;
  }

  return normalized;
}

function isRouteAllowed(pathname: string, routes: string[]): boolean {
  const currentPath = normalizePathname(pathname);

  return routes.some((route) => {
    const allowedPath = normalizePathname(route);

    if (currentPath === allowedPath) return true;
    return allowedPath !== DASHBOARD_ROUTE && currentPath.startsWith(`${allowedPath}/`);
  });
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const role = user?.role;
  const accessibleRoutes = role ? getAccessibleRoutes(role) : [];
  const isAuthorized = !!user && isRouteAllowed(pathname, accessibleRoutes);

  useEffect(() => {
    if (isLoading || !pathname) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (!isAuthorized && pathname !== '/unauthorized') {
      router.replace('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, pathname, isAuthorized, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen h-dvh items-center justify-center bg-navy-50">
        <div className="text-navy-900 font-medium">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex h-screen h-dvh bg-navy-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
