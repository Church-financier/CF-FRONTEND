'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { PermissionGuard } from '@/components/PermissionGuard';

interface DepartmentHead {
  id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  headId: string;
  head: DepartmentHead | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const EMPTY_FORM = { name: '', description: '', headId: '' };

function describeUser(user: User): string {
  const name = user.name || user.email;
  return `${name} — ${user.role.replace(/_/g, ' ')}`;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadDepartments = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<PaginatedResponse<Department>>('/departments?page=1&pageSize=100');
      setDepartments(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await apiFetch<User[]>('/users');
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setOpen(true);
    loadUsers();
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      headId: department.headId,
    });
    setError(null);
    setOpen(true);
    loadUsers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      setError(null);
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        headId: formData.headId,
      };
      if (editing) {
        await apiFetch(`/departments/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/departments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (department: Department) => {
    if (!confirm(`Are you sure you want to delete "${department.name}"?`)) return;
    try {
      setError(null);
      await apiFetch(`/departments/${department.id}`, { method: 'DELETE' });
      loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Department Management"
        right={
          <PermissionGuard permission="department:create">
            <Button onClick={openCreate}>Add Department</Button>
          </PermissionGuard>
        }
      />

      {error && !open && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'Create New Department'}</DialogTitle>
            <DialogDescription>
              Department names appear in the disbursement request form and budget filters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && open && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Department Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Worship &amp; Music"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Description (optional)
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What this department is responsible for"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Department Head
              </label>
              <select
                value={formData.headId}
                onChange={(e) => setFormData({ ...formData, headId: e.target.value })}
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                required
              >
                <option value="">Select a department head</option>
                {loadingUsers && <option disabled>Loading users...</option>}
                {!loadingUsers &&
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {describeUser(user)}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-navy-500">
                The head is matched by user ID. Department Heads only see and submit disbursements for
                the department assigned to them here.
              </p>
              {!loadingUsers && users.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  No users available. Create a user with the Department Head role first.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {editing ? 'Save Changes' : 'Create Department'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading departments...</div>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem]">
            <thead className="bg-navy-50 border-b border-navy-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Head
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-navy-500">
                    No departments found
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3 text-sm text-navy-900 font-medium">
                      {department.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {department.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {department.head?.name || department.head?.email || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <PermissionGuard permission="department:update">
                          <Button variant="outline" size="sm" onClick={() => openEdit(department)}>
                            Edit
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="department:delete">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(department)}
                          >
                            Delete
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
