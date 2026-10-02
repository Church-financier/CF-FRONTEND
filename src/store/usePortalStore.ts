import { create } from 'zustand';

export interface PortalMember {
  id: string;
  fullName: string;
  email: string;
  memberNumber?: string | null;
  organizationId: string;
  organizationName?: string;
  /** Organization base currency (ISO 4217), so the portal can format amounts. */
  organizationCurrency?: string;
}

interface PortalState {
  member: PortalMember | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('portal_token');
  } catch {
    return null;
  }
}

function resolvePortalUrl(endpoint: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return `${base}/portal${endpoint}`;
}

async function api<T>(endpoint: string, options: { method?: string; body?: unknown; skipAuth?: boolean } = {}): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(
    resolvePortalUrl(endpoint),
    {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && !options.skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }
  );
  if (res.status === 401 && !endpoint.startsWith('/login') && !endpoint.startsWith('/refresh') && !options.skipAuth) {
    const refreshed = await fetch(
      resolvePortalUrl('/refresh'),
      { method: 'POST', credentials: 'include' }
    );
    if (refreshed.ok) {
      const data = await fetch(
        resolvePortalUrl(endpoint),
        {
          method: options.method || 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        }
      );
      if (data.ok) return data.status === 204 ? (undefined as T) : data.json();
    }
    localStorage.removeItem('portal_token');
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      msg = typeof j.error === 'string' ? j.error : msg;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const usePortalStore = create<PortalState>((set) => ({
  member: null,
  token: getStoredToken(),
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await api<{ token: string; member: PortalMember }>('/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });
      localStorage.setItem('portal_token', data.token);
      set({ member: data.member, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api('/logout', { method: 'POST' });
    } catch {
      // ignore logout errors
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portal_token');
    }
    set({ member: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ member: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const data = await api<{ member: PortalMember }>('/me');
      set({ member: data.member, token, isAuthenticated: true, isLoading: false });
    } catch {
      if (typeof window !== 'undefined') localStorage.removeItem('portal_token');
      set({ member: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export { api as portalApi };