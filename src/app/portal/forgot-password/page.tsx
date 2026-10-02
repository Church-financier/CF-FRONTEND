'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await fetch(
        (process.env.NEXT_PUBLIC_API_URL || '') + '/api/portal/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        }
      );
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request reset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-navy-900 p-4 py-8 sm:items-center sm:py-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Reset portal password</h1>
          <p className="text-sm text-navy-500 mt-2">
            Enter your email and we&apos;ll send a new temporary password.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
              If <strong>{email}</strong> is associated with an active portal account, a new temporary password has been sent. Check your inbox and sign in to change it.
            </div>
            <Link href="/portal/login" className="block text-center text-sm text-navy-700 hover:text-navy-900 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send temporary password'}
            </Button>
            <p className="text-center text-sm text-navy-600">
              <Link href="/portal/login" className="text-navy-900 font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';