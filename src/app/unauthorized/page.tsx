'use client';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getAccessibleRoutes } from '@/lib/permissions';

export default function UnauthorizedPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const routes = getAccessibleRoutes(user.role);
      const landing = routes.includes('/dashboard') ? '/dashboard' : routes[0] || '/login';
      router.replace(landing);
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-navy-900 sm:text-6xl">403</h1>
        <h2 className="mt-4 text-xl font-semibold text-navy-900 sm:text-2xl">Unauthorized Access</h2>
        <p className="mx-auto mt-2 max-w-md text-navy-500">
          You do not have permission to access this page. You will be redirected to your dashboard.
        </p>
        <Button
          onClick={() => {
            const routes = user ? getAccessibleRoutes(user.role) : [];
            router.push(routes.includes('/dashboard') ? '/dashboard' : routes[0] || '/login');
          }}
          className="mt-6 w-full sm:w-auto"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
