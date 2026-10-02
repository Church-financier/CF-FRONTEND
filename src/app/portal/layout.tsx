'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePortalStore } from '@/store/usePortalStore';
import { LogOut, Heart, Receipt, User, Wallet } from 'lucide-react';

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { member, isAuthenticated, isLoading, checkAuth, logout } = usePortalStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !pathname.startsWith('/portal/login') && !pathname.startsWith('/portal/forgot-password')) {
      router.replace('/portal/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (pathname.startsWith('/portal/login') || pathname.startsWith('/portal/forgot-password')) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated || !member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900 text-white">
        Loading…
      </div>
    );
  }

  const nav = [
    { href: '/portal/dashboard', label: 'Overview', icon: User },
    { href: '/portal/pledges', label: 'Pledges', icon: Heart },
    { href: '/portal/donations', label: 'Donations', icon: Receipt },
    { href: '/portal/settings', label: 'Settings', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-navy-50">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-xs text-navy-300">Member Portal</p>
            <h1 className="truncate text-base font-semibold sm:text-lg">{member.organizationName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium">{member.fullName}</p>
              <p className="truncate text-xs text-navy-300">{member.email}</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.replace('/portal/login');
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-navy-800"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Portal sections" className="bg-navy-800">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 sm:px-4 lg:px-6">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm sm:flex-none sm:justify-start ${
                    active ? 'border-gold-500 text-gold-400' : 'border-transparent text-navy-100 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" /> {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}