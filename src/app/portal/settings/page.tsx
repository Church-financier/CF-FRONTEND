'use client';

import { useState } from 'react';
import { portalApi, usePortalStore } from '@/store/usePortalStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PortalSettingsPage() {
  const { member } = usePortalStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    try {
      setSubmitting(true);
      await portalApi('/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      setCurrent('');
      setNext('');
      setMessage('Password updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold text-navy-900">Account settings</h1>
      <div className="bg-white border border-navy-200 rounded-lg p-4">
        <p className="text-xs uppercase text-navy-500">Profile</p>
        <p className="font-medium text-navy-900">{member?.fullName}</p>
        <p className="text-sm text-navy-600">{member?.email}</p>
        {member?.memberNumber && (
          <p className="text-xs text-navy-500">Member #{member.memberNumber}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-navy-200 rounded-lg p-4 space-y-4">
        <p className="text-xs uppercase text-navy-500">Change password</p>
        {message && (
          <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{message}</div>
        )}
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Current password</label>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">New password</label>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Update password'}</Button>
      </form>
    </div>
  );
}