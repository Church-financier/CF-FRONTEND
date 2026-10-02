'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortalStore } from '@/store/usePortalStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PortalLoginPage() {
  const router = useRouter();
  const { login, isLoading } = usePortalStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/portal/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-navy-900 p-4 py-8 sm:items-center sm:py-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Member Portal</h1>
          <p className="text-sm text-navy-500 mt-2">Sign in to view your giving and pledges</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
          <p className="text-center text-sm text-navy-600">
            <Link href="/portal/forgot-password" className="text-navy-900 font-medium hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-xs text-navy-500 pt-2 border-t border-navy-200">
            Are you a church admin?{' '}
            <Link href="/login" className="text-navy-900 font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}