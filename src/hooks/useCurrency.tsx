'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePortalStore } from '@/store/usePortalStore';
import { offSocketEvent, onSocketEvent } from '@/store/useSocketStore';
import type { SystemSettings } from '@/lib/api/systemSettingsApi';
import {
  FALLBACK_CURRENCY,
  formatAmountForInput,
  formatCurrency,
  getCurrencyInputMin,
  getCurrencyInputStep,
  getCurrencyName,
  getCurrencySymbol,
  getMinorUnitDigits,
  normalizeCurrencyCode,
  toMajorUnits,
  toMinorUnits,
  type FormatCurrencyOptions,
  type MonetaryValue,
} from '@/lib/currency';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export interface CurrencyContextValue {
  /** ISO 4217 code of the organization's base currency. */
  code: string;
  /** Symbol for the base currency, e.g. "₦". */
  symbol: string;
  /** Full currency name, e.g. "Nigerian Naira". */
  name: string;
  /** "NGN (Nigerian Naira)", for labels and tooltips. */
  label: string;
  /** True while the real setting is still being resolved. */
  isLoading: boolean;
  /** Decimal places in the currency's minor unit (0, 2 or 3). */
  minorUnitDigits: number;
  /** `step` value for amount inputs, e.g. "0.01". */
  inputStep: string;
  /** `min` value for amount inputs, e.g. "0.01". */
  inputMin: string;
  /** Format a stored minor-unit amount, e.g. formatCurrency(150000) -> "₦1,500.00". */
  format: (value: MonetaryValue, options?: FormatCurrencyOptions) => string;
  /** Short form for dense tables, e.g. "₦1.5M". */
  formatCompact: (value: MonetaryValue) => string;
  /** Explicit form, e.g. "₦1,500.00 NGN". */
  formatWithCode: (value: MonetaryValue) => string;
  /** Grouped major-unit string with no symbol, for text inputs. */
  toInputValue: (value: MonetaryValue) => string;
  /** Convert user input (major units) into the stored minor-unit amount. */
  toMinorUnits: (value: number | string) => number;
  /** Convert a stored minor-unit amount into major units. */
  toMajorUnits: (value: MonetaryValue) => number;
  /** Underlying system settings, for the settings screen. */
  settings: SystemSettings | null;
  refetchSettings: () => Promise<SystemSettings | null>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const FALLBACK_CONTEXT_VALUE: CurrencyContextValue = {
  code: FALLBACK_CURRENCY,
  symbol: getCurrencySymbol(FALLBACK_CURRENCY),
  name: getCurrencyName(FALLBACK_CURRENCY),
  label: `${FALLBACK_CURRENCY} (${getCurrencyName(FALLBACK_CURRENCY)})`,
  isLoading: false,
  minorUnitDigits: getMinorUnitDigits(FALLBACK_CURRENCY),
  inputStep: getCurrencyInputStep(FALLBACK_CURRENCY),
  inputMin: getCurrencyInputMin(FALLBACK_CURRENCY),
  format: (value, options) => formatCurrency(value, FALLBACK_CURRENCY, 'en', options),
  formatCompact: (value) => formatCurrency(value, FALLBACK_CURRENCY, 'en', { compact: true }),
  formatWithCode: (value) => formatCurrency(value, FALLBACK_CURRENCY, 'en', { showCode: true }),
  toInputValue: (value) => formatAmountForInput(value, FALLBACK_CURRENCY),
  toMinorUnits: (value) => toMinorUnits(value, FALLBACK_CURRENCY),
  toMajorUnits: (value) => toMajorUnits(value, FALLBACK_CURRENCY),
  settings: null,
  refetchSettings: async () => null,
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const isStaffAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPortalAuthenticated = usePortalStore((state) => state.isAuthenticated);
  const portalCurrency = usePortalStore((state) => state.member?.organizationCurrency ?? null);

  // Member portal sessions cannot read /system/settings, so the organization
  // currency is carried on the portal member payload instead.
  const enabled = isStaffAuthenticated || isPortalAuthenticated;

  const { data, isLoading, refetch } = useSystemSettings({ enabled, silent: true });

  const code = useMemo(
    () => normalizeCurrencyCode(data?.baseCurrency ?? portalCurrency),
    [data?.baseCurrency, portalCurrency]
  );

  // Same-tab updates: useSystemSettings.save() invalidates the shared cache and
  // broadcasts this event, which covers the settings screen saving the setting.
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      void refetch();
    };
    window.addEventListener('system-settings:updated', handler);
    return () => window.removeEventListener('system-settings:updated', handler);
  }, [enabled, refetch]);

  // Cross-session updates: the server broadcasts to every connected client.
  useEffect(() => {
    if (!isStaffAuthenticated) return;
    const handler = () => {
      void refetch();
    };
    onSocketEvent('organization:settings_updated', handler);
    return () => offSocketEvent('organization:settings_updated', handler);
  }, [isStaffAuthenticated, refetch]);

  const format = useCallback(
    (value: MonetaryValue, options?: FormatCurrencyOptions) => formatCurrency(value, code, 'en', options),
    [code]
  );

  const value = useMemo<CurrencyContextValue>(() => {
    const symbol = getCurrencySymbol(code);
    const name = getCurrencyName(code);
    return {
      code,
      symbol,
      name,
      label: `${code} (${name})`,
      isLoading,
      minorUnitDigits: getMinorUnitDigits(code),
      inputStep: getCurrencyInputStep(code),
      inputMin: getCurrencyInputMin(code),
      format,
      formatCompact: (amount: MonetaryValue) => formatCurrency(amount, code, 'en', { compact: true }),
      formatWithCode: (amount: MonetaryValue) => formatCurrency(amount, code, 'en', { showCode: true }),
      toInputValue: (amount: MonetaryValue) => formatAmountForInput(amount, code),
      toMinorUnits: (input: number | string) => toMinorUnits(input, code),
      toMajorUnits: (amount: MonetaryValue) => toMajorUnits(amount, code),
      settings: data,
      refetchSettings: refetch,
    };
  }, [code, data, format, isLoading, refetch]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Access the organization's base currency. Every monetary value rendered in the
 * app must go through this so it follows the `baseCurrency` system setting.
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  return context ?? FALLBACK_CONTEXT_VALUE;
}
