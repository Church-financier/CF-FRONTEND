'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getPendingMfaUserId, useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function MfaVerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { verifyMfa } = useAuthStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pending = getPendingMfaUserId() ?? params.get('userId');
    if (!pending) {
      setError('Your verification session has expired. Please sign in again to request a new code.');
      return;
    }
    setUserId(pending);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('Your verification session has expired. Please sign in again to request a new code.');
      return;
    }

    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    try {
      setSubmitting(true);
      await verifyMfa(userId, code);
      router.replace('/dashboard');
    } catch (err) {
      setCode('');
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-navy-900 p-4 py-8 sm:items-center sm:py-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Two-factor verification</h1>
          <p className="text-sm text-navy-500 mt-1">
            We sent a 6-digit code to your email. Enter it below to finish signing in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="mfa-code">
              Verification code
            </label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="text-center tracking-[0.5em] text-lg font-semibold"
              autoFocus
              disabled={!userId || submitting}
            />
            <p className="text-xs text-navy-500 mt-1">The code expires after 10 minutes.</p>
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !userId || code.length !== 6}>
            {submitting ? 'Verifying…' : 'Verify and sign in'}
          </Button>

          <p className="text-center text-sm text-navy-600">
            Didn&apos;t get a code?{' '}
            <Link href="/login" className="text-navy-900 font-medium hover:underline">
              Sign in again
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-navy-900 text-white">Loading…</div>}>
      <MfaVerifyInner />
    </Suspense>
  );
}
