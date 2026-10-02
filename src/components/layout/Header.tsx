'use client';

import { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';

interface HeaderProps {
  title?: string;
  right?: ReactNode;
  onMenuClick?: () => void;
}

export function Header({ title, right, onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const openSidebar = useSidebarStore((state) => state.open);

  return (
    <header className="flex min-h-16 flex-col gap-3 rounded border border-navy-200 bg-white px-4 py-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-0 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        {/* The dashboard shell is the only consumer of this header, so the
            button always drives the off-canvas sidebar on small screens. */}
        <button
          onClick={onMenuClick ?? openSidebar}
          aria-label="Open navigation menu"
          className="-ml-1 shrink-0 rounded-md p-1 transition-colors hover:bg-navy-100 lg:hidden"
        >
          <Menu className="h-5 w-5 text-navy-700" />
        </button>
        <div className="flex min-w-0 flex-col">
          {user?.organizationName && (
            <p className="truncate text-sm text-navy-500 sm:text-xl">{user.organizationName}</p>
          )}
          <h2 className="truncate text-base font-semibold text-navy-900 sm:text-lg">{title}</h2>
        </div>
      </div>
      {right ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-4">
          {right}
        </div>
      ) : null}
    </header>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();

  return (
    <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy-500">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="mx-2 text-navy-300">/</span>}
          {item.href ? (
            <button
              onClick={() => router.push(item.href!)}
              className="transition-colors hover:text-navy-700"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-navy-900">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
