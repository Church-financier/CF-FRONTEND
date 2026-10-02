'use client';

import { useCallback, useEffect, useState } from 'react';
import { useErrorStore } from '@/store/useErrorStore';
import { fetchSystemSettings, updateSystemSettings, type SystemSettings, type SystemSettingsUpdate } from '@/lib/api/systemSettingsApi';

export const SYSTEM_SETTINGS_QUERY_KEY = 'system-settings';

export interface UseSystemSettingsOptions {
  /**
   * Skip fetching entirely. Used by app-wide consumers (e.g. the currency
   * provider) so unauthenticated surfaces never fire a request that would
   * surface a 401 toast.
   */
  enabled?: boolean;
  /**
   * Keep failures out of the global error toaster. Background consumers such as
   * the currency provider should degrade to a fallback currency quietly rather
   * than interrupting the user.
   */
  silent?: boolean;
}

export function useSystemSettings(options: UseSystemSettingsOptions = {}) {
  const { enabled = true, silent = false } = options;
  const [data, setData] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return null;
    setIsLoading(true);
    setError(null);
    try {
      const settings = await fetchSystemSettings();
      setData(settings);
      return settings;
    } catch (err) {
      if (silent) useErrorStore.getState().clearError();
      setError(err instanceof Error ? err.message : 'Failed to load system settings');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enabled, silent]);

  const save = useCallback(
    async (patch: SystemSettingsUpdate) => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await updateSystemSettings(patch);
        setData(updated);
        invalidateSystemSettingsCache();
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save system settings');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const invalidate = useCallback(() => {
    invalidateSystemSettingsCache();
    void fetch();
  }, [fetch]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void fetch();
  }, [enabled, fetch]);

  return { data, isLoading, isSaving, error, save, refetch: fetch, invalidate };
}

let cacheVersion = 0;
const listeners: Array<() => void> = [];

export function getSystemSettingsCacheVersion() {
  return cacheVersion;
}

export function invalidateSystemSettingsCache() {
  cacheVersion += 1;
  listeners.forEach((cb) => cb());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('system-settings:updated'));
  }
}

export function subscribeSystemSettingsCache(cb: () => void) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
