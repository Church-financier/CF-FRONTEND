import { useErrorStore } from '@/store/useErrorStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const USE_PROXY = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL;

function resolveUrl(endpoint: string): string {
  if (USE_PROXY) {
    return `/api${endpoint}`;
  }
  const base = API_BASE_URL || 'http://localhost:3001/api';
  return `${base}${endpoint}`;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface ApiFetchOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  skipAuth?: boolean;
  retryOn401?: boolean;
  /**
   * Idempotency key for a state-changing request. A UUID v4 minted once per
   * logical form submission: retrying the same submission with the same key
   * makes the server return the cached response instead of posting a second
   * payment or ledger entry.
   */
  idempotencyKey?: string;
}

const MUTATING_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

/**
 * UUID v4, matching the format the backend requires in `X-Idempotency-Key`.
 * `crypto.randomUUID` is used when available; the fallback keeps the same
 * shape for older browsers and non-secure contexts.
 */
export function createIdempotencyKey(): string {
  const cryptoRef = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
    cryptoRef.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Set the version (4) and variant bits required of a UUID v4.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * True when the endpoint is one of the state-changing financial endpoints
 * that require an idempotency key.
 */
export function requiresIdempotencyKey(endpoint: string): boolean {
  return /^\/(contributions|disbursements|ledger|journals)(\/|$)/.test(endpoint.split('?')[0]);
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function shouldAttachAuth(endpoint: string): boolean {
  return !/^\/auth\/(login|signup|register|forgot-password|reset-password|refresh)$/.test(endpoint);
}

function shouldUseCredentials(endpoint: string): boolean {
  return !USE_PROXY || !/^https?:/.test(resolveUrl(endpoint));
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(resolveUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { token?: string };
      if (data?.token) {
        localStorage.setItem('auth_token', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false, retryOn401 = true, idempotencyKey } = options;
  const token = await getToken();
  const attachAuth = !skipAuth && shouldAttachAuth(endpoint) && !!token;

  // One key per call: reusing it across a 401-refresh retry is exactly what
  // makes a replayed request safe, while a fresh submission gets a fresh key.
  const needsIdempotencyKey =
    MUTATING_METHODS.includes(method) && requiresIdempotencyKey(endpoint);
  const key = needsIdempotencyKey ? idempotencyKey ?? createIdempotencyKey() : undefined;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(attachAuth ? { Authorization: `Bearer ${token}` } : {}),
    ...(key ? { 'X-Idempotency-Key': key } : {}),
    ...headers,
  };

  const clearError = useErrorStore.getState().clearError;
  clearError();

  const performRequest = () =>
    fetch(resolveUrl(endpoint), {
      method,
      headers: requestHeaders,
      credentials: shouldUseCredentials(endpoint) ? 'include' : 'omit',
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

  try {
    let res = await performRequest();

    if (res.status === 401 && attachAuth && retryOn401 && !endpoint.startsWith('/auth/refresh')) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const newToken = await getToken();
        if (newToken) {
          (requestHeaders as Record<string, string>).Authorization = `Bearer ${newToken}`;
        }
        res = await performRequest();
      }
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `API Error ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        const extracted =
          typeof errorJson.message === 'string'
            ? errorJson.message
            : typeof errorJson.error === 'string'
              ? errorJson.error
              : typeof errorJson.error === 'object' && errorJson.error !== null
                ? JSON.stringify(errorJson.error)
                : undefined;
        errorMessage = extracted || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      if (res.status === 401 && attachAuth) {
        localStorage.removeItem('auth_token');
      }

      useErrorStore.getState().setError(errorMessage);
      throw new Error(errorMessage);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('ECONNREFUSED')) {
      useErrorStore.getState().setError('Cannot reach the server. Please check your connection and try again.');
      throw new Error('Cannot reach the server. Please check your connection and try again.');
    }
    if (!useErrorStore.getState().error) {
      useErrorStore.getState().setError(message);
    }
    throw err;
  }
}

export async function apiOpenPdf(endpoint: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(resolveUrl(endpoint), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: shouldUseCredentials(endpoint) ? 'include' : 'omit',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load document (${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export async function apiDownload(endpoint: string, defaultFilename = 'download'): Promise<void> {
  const token = await getToken();
  const res = await fetch(resolveUrl(endpoint), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
