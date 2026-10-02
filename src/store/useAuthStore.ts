import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'TREASURER' | 'FINANCIAL_SECRETARY' | 'AUDITOR' | 'DEPARTMENT_HEAD';
  organizationId: string;
  organizationName: string;
  mfaEnabled?: boolean;
  emailVerified?: boolean;
}

export const MFA_PENDING_KEY = 'mfa_pending_user_id';

export function getPendingMfaUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(MFA_PENDING_KEY);
  } catch {
    return null;
  }
}

function setPendingMfaUserId(userId: string | null) {
  try {
    if (userId) sessionStorage.setItem(MFA_PENDING_KEY, userId);
    else sessionStorage.removeItem(MFA_PENDING_KEY);
  } catch {
    // ignore storage errors
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMfaUserId: string | null;
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; mfaUserId?: string }>;
  verifyMfa: (userId: string, code: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  registerChurch: (data: { churchName: string; adminName: string; email: string; password: string; confirmPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enableMfa: () => Promise<void>;
  disableMfa: () => Promise<void>;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: false,
  isLoading: true,
  pendingMfaUserId: getPendingMfaUserId(),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ token?: string; user?: User; mfaRequired?: boolean; userId?: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });

      if (data?.mfaRequired && data?.userId) {
        setPendingMfaUserId(data.userId);
        set({ pendingMfaUserId: data.userId, isLoading: false });
        return { mfaRequired: true, mfaUserId: data.userId };
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid login response');
      }

      localStorage.setItem('auth_token', data.token);
      const fullUser = await apiFetch<{ user: User }>('/auth/me');
      set({ user: fullUser.user, token: data.token, isAuthenticated: true, isLoading: false });
      return {};
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  verifyMfa: async (userId, code) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/login/mfa', {
        method: 'POST',
        body: { userId, code },
        skipAuth: true,
      });
      localStorage.setItem('auth_token', data.token);
      setPendingMfaUserId(null);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false, pendingMfaUserId: null });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateProfile: async (data) => {
    const result = await apiFetch<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: data,
    });
    if (result?.user) {
      set({ user: result.user });
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    await apiFetch('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },

  enableMfa: async () => {
    await apiFetch('/auth/mfa/enable', { method: 'POST' });
    const me = await apiFetch<{ user: User }>('/auth/me');
    if (me?.user) set({ user: me.user });
  },

  disableMfa: async () => {
    await apiFetch('/auth/mfa/disable', { method: 'POST' });
    const me = await apiFetch<{ user: User }>('/auth/me');
    if (me?.user) set({ user: me.user });
  },

  signup: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/signup', {
        method: 'POST',
        body: { name, email, password },
        skipAuth: true,
      });

      localStorage.setItem('auth_token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  registerChurch: async (data) => {
    set({ isLoading: true });
    try {
      const result = await apiFetch<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: {
          churchName: data.churchName,
          adminName: data.adminName,
          email: data.email,
          password: data.password,
        },
        skipAuth: true,
      });

      localStorage.setItem('auth_token', result.token);
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout errors
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    setPendingMfaUserId(null);
    set({ user: null, token: null, isAuthenticated: false, pendingMfaUserId: null });
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const data = await apiFetch<{ user: User }>('/auth/me');
      set({ user: data.user, token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      console.error('Auth check failed:', err);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
