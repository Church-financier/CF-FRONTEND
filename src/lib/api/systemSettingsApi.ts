import { apiFetch } from '@/lib/api';

export interface SystemSettings {
  id: string;
  organizationName: string;
  baseCurrency: string;
  fiscalYearStartMonth: number;
  timezone: string;
  requireMfa: boolean;
  sessionTimeoutMinutes: number;
  /** Document header address; printed on receipts, vouchers and reports. */
  address: string;
  /** Document header phone line. */
  phone: string;
  /** Document header email line. */
  email: string;
  /** Absolute or relative URL of the organization logo. */
  logoUrl: string;
  createdAt: string;
}

export interface SystemSettingsUpdate {
  organizationName?: string;
  baseCurrency?: string;
  fiscalYearStartMonth?: number;
  timezone?: string;
  requireMfa?: boolean;
  sessionTimeoutMinutes?: number;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return apiFetch<SystemSettings>('/system/settings');
}

export async function updateSystemSettings(data: SystemSettingsUpdate): Promise<SystemSettings> {
  return apiFetch<SystemSettings>('/system/settings', {
    method: 'PUT',
    body: data,
  });
}
