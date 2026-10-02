'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Member {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  memberNumber: string | null;
  isActive: boolean;
  portalAccess?: boolean;
  joinedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', memberNumber: '' });
  const [error, setError] = useState<string | null>(null);
  const [portalMsg, setPortalMsg] = useState<string | null>(null);
  // Guards a double-clicked save, archive or portal toggle.
  const [saving, setSaving] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '100');
      if (search) params.set('search', search);
      const data = await apiFetch<PaginatedResponse<Member>>(`/members?${params.toString()}`);
      setMembers(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch(editingMember ? `/members/${editingMember.id}` : '/members', {
        method: editingMember ? 'PATCH' : 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          memberNumber: form.memberNumber || undefined,
        }),
      });
      setForm({ fullName: '', email: '', phone: '', address: '', memberNumber: '' });
      setEditingMember(null);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create member');
    } finally {
      setSaving(false);
    }
  };

  const editMember = (member: Member) => {
    setEditingMember(member);
    setForm({
      fullName: member.fullName,
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      memberNumber: member.memberNumber || '',
    });
    setOpen(true);
  };

  const archiveMember = async (member: Member) => {
    if (!window.confirm(`Archive ${member.fullName}? Their financial history will be retained.`)) return;
    if (busyMemberId) return;
    setBusyMemberId(member.id);
    try {
      await apiFetch(`/members/${member.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive member');
    } finally {
      setBusyMemberId(null);
    }
  };

  const togglePortalAccess = async (m: Member) => {
    setPortalMsg(null);
    if (!m.email) {
      setError('Member must have an email to enable portal access.');
      return;
    }
    if (busyMemberId) return;
    setBusyMemberId(m.id);
    try {
      const enabled = !m.portalAccess;
      const result = await apiFetch<{ portalAccess: boolean; initialPassword?: string }>(
        `/portal/members/${m.id}/portal-access`,
        { method: 'POST', body: { enabled } }
      );
      if (enabled && result.initialPassword) {
        setPortalMsg(`Portal enabled for ${m.fullName}. Temporary password: ${result.initialPassword} (also emailed to ${m.email})`);
      } else {
        setPortalMsg(`Portal ${enabled ? 'enabled' : 'disabled'} for ${m.fullName}`);
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update portal access');
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Member Directory"
        right={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search members"
              className="w-full sm:w-64"
            />
            <PermissionGuard permission="member:create">
              <Button onClick={() => { setEditingMember(null); setForm({ fullName: '', email: '', phone: '', address: '', memberNumber: '' }); setOpen(true); }}>Add Member</Button>
            </PermissionGuard>
            <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditingMember(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input placeholder="Full Name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  <Input placeholder="Member Number" value={form.memberNumber} onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} />
                  {error && <p className="text-sm text-red-700">{error}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : editingMember ? 'Save Changes' : 'Save'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
      )}
      {portalMsg && (
        <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">{portalMsg}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading members...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Member #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Portal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy-500">No members found</td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium">{m.fullName}{!m.isActive && <span className="ml-2 text-xs font-normal text-navy-500">Archived</span>}</td>
                    <td className="px-4 py-3 text-sm text-navy-600">{m.memberNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-navy-600">{m.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {m.portalAccess ? (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Enabled</span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs bg-navy-100 text-navy-700 rounded">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <PermissionGuard permission="member:update"><Button size="sm" variant="outline" onClick={() => editMember(m)} disabled={busyMemberId === m.id}>Edit</Button></PermissionGuard>
                        <PermissionGuard permission="member:delete"><Button size="sm" variant="outline" onClick={() => archiveMember(m)} disabled={!m.isActive || busyMemberId === m.id}>{m.isActive ? 'Archive' : 'Archived'}</Button></PermissionGuard>
                        <PermissionGuard permission="member:update">
                          <Button size="sm" variant="ghost" onClick={() => togglePortalAccess(m)} disabled={!m.email || busyMemberId === m.id}>
                            {busyMemberId === m.id ? 'Saving...' : m.portalAccess ? 'Disable Portal' : 'Enable Portal'}
                          </Button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
