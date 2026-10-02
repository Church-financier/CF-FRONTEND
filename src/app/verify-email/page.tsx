'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing or invalid verification token. Please request a new verification email.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing or invalid verification token.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/verify-email', {
        method: 'POST',
        body: { token },
        skipAuth: true,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-navy-900 p-4 py-8 sm:items-center sm:py-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Verify your email</h1>
          <p className="text-sm text-navy-500 mt-2">
            Click the button below to confirm your email address.
          </p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
              Your email has been verified successfully. You can now sign in.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-navy-700 hover:text-navy-900 hover:underline"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting || !token}>
              {submitting ? 'Verifying…' : 'Verify email'}
            </Button>
            <p className="text-center text-sm text-navy-600">
              <Link href="/login" className="text-navy-900 font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-navy-900 text-white">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
