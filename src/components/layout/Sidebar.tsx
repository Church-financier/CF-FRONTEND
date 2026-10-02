'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  HandCoins,
  Receipt,
  Heart,
  FileText,
  Store,
  Calculator,
  LogOut,
  Users,
  UserPlus,
  X,
  History,
  Lock,
  Target,
  UserCog,
  Building2,
  Settings,
} from 'lucide-react';
import { useAuthStore, type User } from '@/store/useAuthStore';
import { useSidebarStore } from '@/store/useSidebarStore';
import { hasPermission, isRole } from '@/lib/permissions';
import { navigationItems, adminNavItems } from '@/lib/navigation';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Wallet,
  BookOpen,
  HandCoins,
  Receipt,
  Heart,
  FileText,
  Store,
  Calculator,
  Users,
  UserPlus,
  History,
  Lock,
  Target,
  UserCog,
  Building2,
  Settings,
};

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function canAccessNavItem(item: typeof navigationItems[0], user: User | null): boolean {
  if (!user) return false;
  if (item.requiredPermission && !hasPermission(user.role, item.requiredPermission)) {
    return false;
  }
  if (item.requiredAnyPermission && !item.requiredAnyPermission.some((permission) => hasPermission(user.role, permission))) {
    return false;
  }
  if (item.requiredRole && !isRole(user.role, ...item.requiredRole)) {
    return false;
  }
  return true;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const storeOpen = useSidebarStore((state) => state.isOpen);
  const closeStore = useSidebarStore((state) => state.close);

  // Explicit props win; otherwise the drawer follows the shared store that the
  // header's menu button drives.
  const isControlled = open !== undefined;
  const visible = isControlled ? open : storeOpen;
  const close = onClose ?? closeStore;

  // Navigating away (including browser back/forward) always dismisses the drawer.
  useEffect(() => {
    closeStore();
  }, [pathname, closeStore]);

  // Stop the page behind the drawer from scrolling while it is open.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const handleNavigate = (href: string) => {
    router.push(href);
    close();
  };

  const allNavItems = [...navigationItems, ...adminNavItems];
  const visibleItems = allNavItems.filter((item) => canAccessNavItem(item, user));

  return (
    <>
      {visible && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col overflow-y-auto border-r border-navy-800 bg-navy-900 text-white transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:max-w-none lg:translate-x-0 lg:overflow-hidden',
          visible ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full'
        )}
      >
        <div className="flex shrink-0 items-center justify-between p-4 lg:p-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
              CHURCH FINANCIER
            </h1>
            <p className="mt-1 hidden text-xs text-navy-300 sm:block">Executive Financial Suite</p>
          </div>
          <button
            onClick={close}
            aria-label="Close navigation"
            className="-mr-1 shrink-0 rounded-md p-1 transition-colors hover:bg-navy-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 lg:py-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = ICON_MAP[item.icon];

            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left',
                  isActive
                    ? 'bg-navy-800 text-gold-400'
                    : 'text-navy-100 hover:bg-navy-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-navy-800 p-3 lg:p-4">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-bold text-sm shrink-0">
                {user.name ? user.name.charAt(0) : user.email.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                <p className="text-xs text-navy-300 truncate">{user.role.replace(/_/g, ' ')}</p>
                {user.organizationName && (
                  <p className="text-xs text-gold-400 truncate">{user.organizationName}</p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => handleNavigate('/settings')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-navy-100 hover:text-white hover:bg-navy-800 rounded-md transition-colors mb-1"
          >
            <UserCog className="h-4 w-4 shrink-0" />
            <span className="truncate">Settings</span>
          </button>
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-navy-100 hover:text-white hover:bg-navy-800 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
