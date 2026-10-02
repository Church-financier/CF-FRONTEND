'use client';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { CURRENCY_OPTIONS, HISTORICAL_CURRENCY_NOTE, normalizeCurrencyCode } from '@/lib/currency';
import type { SystemSettings } from '@/lib/api/systemSettingsApi';
import { useEffect, useState } from 'react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const COMMON_TIMEZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'UTC',
];

export default function OrganizationSettingsPage() {
  return (
    <PermissionGuard
      allowedRoles={['SUPER_ADMIN']}
      fallback={
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <p className="text-navy-500">You do not have permission to access system settings.</p>
        </div>
      }
    >
      <OrganizationSettingsContent />
    </PermissionGuard>
  );
}

function OrganizationSettingsContent() {
  const { data: settings, isLoading, isSaving, error, save } = useSystemSettings();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setPendingError(null);
    setSuccess(null);
    try {
      await save({
        organizationName: form.organizationName,
        baseCurrency: form.baseCurrency,
        fiscalYearStartMonth: form.fiscalYearStartMonth,
        timezone: form.timezone,
        requireMfa: form.requireMfa,
        sessionTimeoutMinutes: form.sessionTimeoutMinutes,
        address: form.address,
        phone: form.phone,
        email: form.email,
        logoUrl: form.logoUrl,
      });
      setSuccess('Organization settings saved successfully.');
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="System Settings" />
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <Header title="System Settings" />
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <p className="text-navy-500">{error ?? 'No organization found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="System Settings" />
      <p className="text-sm text-navy-500">Configure organization-wide preferences and security</p>

      {success && (
        <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{success}</div>
      )}
      {pendingError && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{pendingError}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Organization Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Organization Name</label>
              <Input
                value={form.organizationName}
                onChange={(e) =>
                  setForm({ ...form, organizationName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="base-currency">
                Base Currency
              </label>
              <select
                id="base-currency"
                value={form.baseCurrency}
                onChange={(e) => setForm({ ...form, baseCurrency: e.target.value.toUpperCase() })}
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                {CURRENCY_OPTIONS.some((option) => option.code === form.baseCurrency) ? null : (
                  <option value={form.baseCurrency}>{form.baseCurrency} (current)</option>
                )}
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} — {option.name} ({option.symbol})
                  </option>
                ))}
              </select>
              <p className="text-xs text-navy-500 mt-1">
                ISO 4217 currency code used to display and record every amount across the
                organization. Changing it takes effect immediately.
              </p>
              {normalizeCurrencyCode(form.baseCurrency) !== form.baseCurrency && (
                <p className="text-xs text-red-600 mt-1">
                  &quot;{form.baseCurrency}&quot; is not a valid 3-letter ISO 4217 code.
                </p>
              )}
            </div>
          </div>
          <p className="mt-4 p-3 text-xs text-navy-600 bg-navy-50 border border-navy-200 rounded-md">
            {HISTORICAL_CURRENCY_NOTE}
          </p>
        </section>

        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Document Branding</h2>
          <p className="text-sm text-navy-500 mb-4">
            Printed in the header of receipts, payment vouchers and financial reports.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="org-address">
                Address
              </label>
              <Input
                id="org-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="12 Allen Avenue, Ikeja, Lagos"
              />
              <p className="text-xs text-navy-500 mt-1">Shown on the first line of every generated document.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="org-phone">
                Phone
              </label>
              <Input
                id="org-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="org-email">
                Email
              </label>
              <Input
                id="org-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="finance@church.org"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="org-logo">
                Logo URL
              </label>
              <Input
                id="org-logo"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://cdn.example.org/logo.png"
              />
              <p className="text-xs text-navy-500 mt-1">
                Leave empty to print a monogram built from the organization name. A logo that
                fails to load falls back to the monogram.
              </p>
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Organization logo preview"
                  className="mt-3 h-16 w-auto rounded border border-navy-200 bg-white object-contain p-1"
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Fiscal Year &amp; Timezone</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Fiscal Year Start Month</label>
              <select
                value={form.fiscalYearStartMonth}
                onChange={(e) => setForm({ ...form, fiscalYearStartMonth: Number(e.target.value) })}
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-navy-500 mt-1">Month when the fiscal year begins (1 = January)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-navy-500 mt-1">IANA timezone identifier for date/time display</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-navy-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Security Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-navy-900">Require Two-Factor Authentication</p>
                <p className="text-sm text-navy-500">Enforce MFA for all users in this organization</p>
              </div>
              <label className="relative inline-flex shrink-0 items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requireMfa}
                  onChange={(e) => setForm({ ...form, requireMfa: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-navy-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-navy-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={form.sessionTimeoutMinutes}
                onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })}
                min={15}
                max={1440}
                className="w-full sm:w-32"
              />
              <p className="text-xs text-navy-500 mt-1">Auto-logout after inactivity (15-1440 minutes)</p>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
