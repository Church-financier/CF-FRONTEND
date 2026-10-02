'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useErrorStore } from '@/store/useErrorStore';

type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let nextId = 1;

export function Toast() {
  const { error, clearError } = useErrorStore();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 5000);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    if (error) {
      pushToast('error', error);
      clearError();
    }
  }, [error, clearError, pushToast]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: ToastType; message?: string };
      if (detail?.message) pushToast(detail.type || 'info', detail.message);
    };
    window.addEventListener('app:toast', handler as EventListener);
    return () => window.removeEventListener('app:toast', handler as EventListener);
  }, [pushToast]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-stretch gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end sm:p-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto w-full rounded-lg border bg-white p-4 shadow-lg transition-all duration-300 sm:max-w-sm',
            t.type === 'success' && 'border-green-200',
            t.type === 'error' && 'border-red-200',
            t.type === 'info' && 'border-blue-200'
          )}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-semibold',
                t.type === 'success' && 'bg-green-600',
                t.type === 'error' && 'bg-red-600',
                t.type === 'info' && 'bg-blue-600'
              )}
            >
              {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}
            </div>
            <div className="flex-1">
              <p className="text-sm text-navy-900 break-words">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 text-navy-400 transition hover:bg-navy-50 hover:text-navy-600"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
