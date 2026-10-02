'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const { user, updateProfile, changePassword, enableMfa, disableMfa } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [mfaErr, setMfaErr] = useState<string | null>(null);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    try {
      setProfileSubmitting(true);
      await updateProfile({ name, email });
      setProfileMsg('Profile updated.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwErr('New password must be at least 6 characters.');
      return;
    }
    try {
      setPwSubmitting(true);
      await changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setPwMsg('Password changed.');
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleMfa = async () => {
    setMfaErr(null);
    setMfaMsg(null);
    try {
      setMfaSubmitting(true);
      if (user?.mfaEnabled) {
        await disableMfa();
        setMfaMsg('Two-factor authentication disabled.');
      } else {
        await enableMfa();
        setMfaMsg('Two-factor authentication enabled. You will be asked for a 6-digit code on your next sign-in.');
      }
    } catch (err) {
      setMfaErr(err instanceof Error ? err.message : 'Failed to update MFA');
    } finally {
      setMfaSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header title="Settings" />

      <form onSubmit={handleProfile} className="max-w-xl space-y-4 rounded-lg border border-navy-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-navy-900">Profile</h2>
        {profileMsg && <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{profileMsg}</div>}
        {profileErr && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{profileErr}</div>}
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <p className="text-xs text-navy-500 mt-1">Changing your email will mark it as unverified.</p>
        </div>
        <Button type="submit" disabled={profileSubmitting} className="w-full sm:w-auto">{profileSubmitting ? 'Saving…' : 'Save profile'}</Button>
      </form>

      <form onSubmit={handlePassword} className="max-w-xl space-y-4 rounded-lg border border-navy-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-navy-900">Change password</h2>
        {pwMsg && <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{pwMsg}</div>}
        {pwErr && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{pwErr}</div>}
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Current password</label>
          <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">New password</label>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
        </div>
        <Button type="submit" disabled={pwSubmitting} className="w-full sm:w-auto">{pwSubmitting ? 'Saving…' : 'Update password'}</Button>
      </form>

      <div className="max-w-xl space-y-4 rounded-lg border border-navy-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-navy-900">Two-factor authentication</h2>
        {mfaMsg && <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{mfaMsg}</div>}
        {mfaErr && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{mfaErr}</div>}
        <p className="text-sm text-navy-600">
          Status: <span className="font-medium text-navy-900">{user?.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
        </p>
        <p className="text-xs text-navy-500">
          When enabled, a 6-digit code will be emailed to you on each sign-in.
        </p>
        <Button type="button" variant={user?.mfaEnabled ? 'outline' : 'default'} onClick={handleMfa} disabled={mfaSubmitting} className="w-full sm:w-auto">
          {mfaSubmitting ? 'Updating…' : user?.mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </Button>
      </div>
    </div>
  );
}