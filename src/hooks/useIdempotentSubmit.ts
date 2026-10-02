'use client';

import { useCallback, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/lib/api';

/**
 * Wraps a state-changing submit so a double-click, an Enter-key repeat or a
 * retry after a dropped connection cannot create a second record.
 *
 * - While a submission is in flight, further calls are ignored (the button is
 *   also expected to be disabled via `pending`).
 * - The same UUID v4 idempotency key is reused for retries of the *same*
 *   logical submission, so the server replays its cached response instead of
 *   executing the financial routine again.
 * - A successful submission clears the key, so the next submission is treated
 *   as a new operation.
 */
export function useIdempotentSubmit<Args extends unknown[], Result>(
  action: (idempotencyKey: string, ...args: Args) => Promise<Result>
) {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const keyRef = useRef<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      if (!keyRef.current) keyRef.current = createIdempotencyKey();
      const key = keyRef.current;
      setPending(true);
      try {
        const result = await action(key, ...args);
        keyRef.current = null;
        return result;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [action]
  );

  /** Discards the retained key, e.g. after the form is reset or cancelled. */
  const resetKey = useCallback(() => {
    keyRef.current = null;
  }, []);

  return { run, pending, resetKey };
}
