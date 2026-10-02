/**
 * Currency primitives.
 *
 * Every monetary value in this app is persisted as an integer number of minor
 * units (the schema calls them `*InKobo`, but they are simply the smallest
 * indivisible unit of the currency). Nothing here is hardcoded to a single
 * currency: the code, and therefore the minor-unit exponent and the symbol,
 * always comes from the organization's `baseCurrency` system setting.
 */

export const FALLBACK_CURRENCY = 'NGN';

/** ISO 4217 codes whose minor unit is not 1/100 of the major unit. */
const MINOR_UNIT_DIGITS: Record<string, number> = {
  // Zero-decimal currencies
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  // Three-decimal currencies
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

/** Currencies offered in the system settings picker. */
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw' },
  { code: 'XOF', name: 'CFA Franc (BCEAO)', symbol: 'CFA' },
  { code: 'XAF', name: 'CFA Franc (BEAC)', symbol: 'FCFA' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DA' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LD' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
];

const OPTION_BY_CODE = new Map(CURRENCY_OPTIONS.map((option) => [option.code, option]));

/** Any monetary value the API can hand back, including serialized BigInts. */
export type MonetaryValue = string | number | bigint | null | undefined;

export interface FormatCurrencyOptions {
  /** Render as e.g. "NGN 1.2M" instead of a fully written-out amount. */
  compact?: boolean;
  /** Force a specific minimum number of fraction digits. */
  minimumFractionDigits?: number;
  /** Force a specific maximum number of fraction digits. */
  maximumFractionDigits?: number;
  /** Show a leading + for positive values. */
  showPositiveSign?: boolean;
  /** Append the ISO code, e.g. "₦1,000.00 NGN". */
  showCode?: boolean;
}

/** Coerce anything into a well-formed ISO 4217 code, falling back to NGN. */
export function normalizeCurrencyCode(code: string | null | undefined): string {
  if (typeof code !== 'string') return FALLBACK_CURRENCY;
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : FALLBACK_CURRENCY;
}

/** Number of decimal places in the currency's minor unit (0, 2 or 3). */
export function getMinorUnitDigits(code: string | null | undefined): number {
  return MINOR_UNIT_DIGITS[normalizeCurrencyCode(code)] ?? 2;
}

function toFiniteNumber(value: MonetaryValue): number {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Convert a stored minor-unit amount into major units for `code`. */
export function toMajorUnits(value: MonetaryValue, code: string | null | undefined): number {
  return toFiniteNumber(value) / 10 ** getMinorUnitDigits(code);
}

/** Convert major units into the stored minor-unit amount for `code`. */
export function toMinorUnits(value: number | string, code: string | null | undefined): number {
  const digits = getMinorUnitDigits(code);
  const cleaned = String(value ?? '').replace(/,/g, '').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 10 ** digits);
}

/**
 * `Intl.NumberFormat` construction is comparatively expensive and tables format
 * hundreds of cells per render, so instances are memoized by their options.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function buildFormatter(
  code: string,
  locale: string,
  options: FormatCurrencyOptions
): Intl.NumberFormat {
  const normalized = normalizeCurrencyCode(code);
  const cacheKey = [
    normalized,
    locale,
    options.compact ? 'c' : '-',
    options.minimumFractionDigits ?? '',
    options.maximumFractionDigits ?? '',
  ].join('|');

  const cached = formatterCache.get(cacheKey);
  if (cached) return cached;

  const base: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: normalized,
    currencyDisplay: 'narrowSymbol',
  };

  if (options.compact) {
    base.notation = 'compact';
    base.compactDisplay = 'short';
    base.maximumFractionDigits = options.maximumFractionDigits ?? 1;
  }
  if (options.minimumFractionDigits !== undefined) {
    base.minimumFractionDigits = options.minimumFractionDigits;
  }
  if (options.maximumFractionDigits !== undefined) {
    base.maximumFractionDigits = options.maximumFractionDigits;
  }

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, base);
  } catch {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: FALLBACK_CURRENCY,
    });
  }
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * Format a stored minor-unit amount using the organization's base currency.
 * This is the single entry point for displaying money anywhere in the app.
 */
export function formatCurrency(
  value: MonetaryValue,
  code: string | null | undefined,
  locale = 'en',
  options: FormatCurrencyOptions = {}
): string {
  const normalized = normalizeCurrencyCode(code);
  const major = toMajorUnits(value, normalized);
  const formatted = buildFormatter(normalized, locale, options).format(major);
  return options.showCode ? `${formatted} ${normalized}` : formatted;
}

/** Grouped major-unit amount with no symbol, suitable for text inputs. */
export function formatAmountForInput(
  value: MonetaryValue,
  code: string | null | undefined,
  locale = 'en'
): string {
  const major = toMajorUnits(value, code);
  if (major === 0) return '';
  return major.toLocaleString(locale, {
    minimumFractionDigits: getMinorUnitDigits(code),
    maximumFractionDigits: getMinorUnitDigits(code),
  });
}

/** `step` attribute matching the currency's smallest unit, for number inputs. */
export function getCurrencyInputStep(code: string | null | undefined): string {
  return String(1 / 10 ** getMinorUnitDigits(code));
}

/** `min` attribute matching the currency's smallest unit, for number inputs. */
export function getCurrencyInputMin(code: string | null | undefined): string {
  return getCurrencyInputStep(code);
}

/** Best-effort symbol for `code`, e.g. "₦" for NGN. */
export function getCurrencySymbol(code: string | null | undefined, locale = 'en'): string {
  const normalized = normalizeCurrencyCode(code);
  const known = OPTION_BY_CODE.get(normalized);
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const symbol = parts.find((part) => part.type === 'currency')?.value;
    if (symbol && symbol !== normalized) return symbol;
  } catch {
    // fall through to the static table
  }
  return known?.symbol ?? normalized;
}

/** Human-readable currency name, e.g. "Nigerian Naira". */
export function getCurrencyName(code: string | null | undefined, locale = 'en'): string {
  const normalized = normalizeCurrencyCode(code);
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'currency' });
    const name = displayNames.of(normalized);
    if (name) return name;
  } catch {
    // fall through to the static table
  }
  return OPTION_BY_CODE.get(normalized)?.name ?? normalized;
}

/**
 * Historical amounts are stored without a per-record currency, so changing the
 * base currency relabels the figures rather than converting them. Callers
 * surface this string wherever the distinction is meaningful.
 */
export const HISTORICAL_CURRENCY_NOTE =
  'Changing the base currency updates how amounts are displayed and recorded from now on. ' +
  'Amounts entered before this change are not converted — they remain in the currency that was ' +
  'configured at the time of entry.';
