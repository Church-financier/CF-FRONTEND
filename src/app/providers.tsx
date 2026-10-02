'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import { connectSocket, disconnectSocketStore } from '@/store/useSocketStore';
import { CurrencyProvider } from '@/hooks/useCurrency';

function AuthGate({ children }: { children: ReactNode }) {
  const { checkAuth, isLoading, user, token } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user && token) {
      connectSocket(token);
    } else {
      disconnectSocketStore();
    }

    return () => {
      disconnectSocketStore();
    };
  }, [user, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50">
        <div className="text-navy-900 font-medium">Loading...</div>
      </div>
    );
  }

  return <CurrencyProvider>{children}</CurrencyProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
