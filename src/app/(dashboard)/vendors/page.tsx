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
import { formatVendorId, copyToClipboard } from '@/lib/utils';
import { PermissionGuard } from '@/components/PermissionGuard';

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  createdAt: string;
}

interface VendorFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
}

const EMPTY_FORM: VendorFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
};

function VendorIdCell({ id }: { id: string }) {
  const [showFull, setShowFull] = useState(false);
  const formatted = formatVendorId(id);
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-navy-600 font-mono" title={id}>
        {formatted}
      </span>
      <button
        type="button"
        onClick={() => {
          copyToClipboard(id);
          setShowFull(true);
          setTimeout(() => setShowFull(false), 1500);
        }}
        className="text-xs text-navy-400 hover:text-navy-600 transition-colors"
        title="Copy full ID"
      >
        {showFull ? 'Copied!' : '⧉'}
      </button>
    </div>
  );
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

function VendorFormFields({ formData, setFormData }: {
  formData: VendorFormState;
  setFormData: (value: VendorFormState) => void;
}) {
  const update = (key: keyof VendorFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [key]: e.target.value });

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">Vendor Name</label>
        <Input value={formData.name} onChange={update('name')} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
          <Input type="email" value={formData.email} onChange={update('email')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Phone</label>
          <Input value={formData.phone} onChange={update('phone')} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">Address</label>
        <Input value={formData.address} onChange={update('address')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">Tax ID</label>
        <Input value={formData.taxId} onChange={update('taxId')} placeholder="TIN / VAT number" />
      </div>
      <div className="border-t border-navy-200 pt-4">
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">
          Banking Information
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Bank Name</label>
            <Input value={formData.bankName} onChange={update('bankName')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Account Name</label>
              <Input value={formData.bankAccountName} onChange={update('bankAccountName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Account Number</label>
              <Input value={formData.bankAccountNumber} onChange={update('bankAccountNumber')} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormState>(EMPTY_FORM);

  const loadVendors = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<PaginatedResponse<Vendor>>('/vendors?page=1&pageSize=100');
      setVendors(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditing(vendor);
    setFormData({
      name: vendor.name ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      taxId: vendor.taxId ?? '',
      bankName: vendor.bankName ?? '',
      bankAccountName: vendor.bankAccountName ?? '',
      bankAccountNumber: vendor.bankAccountNumber ?? '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      if (editing) {
        await apiFetch(`/vendors/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        setNotice(`${formData.name} updated.`);
      } else {
        await apiFetch('/vendors', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setNotice(`${formData.name} created.`);
      }
      setFormData(EMPTY_FORM);
      setEditing(null);
      setOpen(false);
      await loadVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiFetch(`/vendors/${deleting.id}`, { method: 'DELETE' });
      setNotice(`${deleting.name} deleted.`);
      setDeleting(null);
      await loadVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Vendor Management"
        right={
          <PermissionGuard permission="vendor:create">
            <Button onClick={openCreate}>Add Vendor</Button>
          </PermissionGuard>
        }
      />

      {notice && (
        <div className="flex flex-col gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="break-words">{notice}</span>
          <button className="self-start text-green-700 hover:text-green-900 sm:self-auto" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading vendors...</div>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem]">
              <thead className="bg-navy-50 border-b border-navy-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Vendor ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Tax ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Bank Details
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-navy-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-navy-500">
                      No vendors found
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-navy-50 align-top">
                      <td className="px-4 py-3">
                        <VendorIdCell id={vendor.id} />
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-900 font-medium">
                        {vendor.name}
                        {vendor.address && (
                          <p className="text-xs text-navy-500 font-normal mt-0.5">{vendor.address}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600">
                        {vendor.email || '-'}
                        {vendor.phone && <p className="text-xs text-navy-400">{vendor.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600 font-mono text-xs">
                        {vendor.taxId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600">
                        {vendor.bankName || vendor.bankAccountNumber ? (
                          <>
                            {vendor.bankName && <p>{vendor.bankName}</p>}
                            {vendor.bankAccountName && (
                              <p className="text-xs text-navy-500">{vendor.bankAccountName}</p>
                            )}
                            {vendor.bankAccountNumber && (
                              <p className="text-xs text-navy-500 font-mono">
                                {vendor.bankAccountNumber}
                              </p>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <PermissionGuard permission="vendor:update">
                            <Button size="sm" variant="outline" onClick={() => openEdit(vendor)}>
                              Edit
                            </Button>
                          </PermissionGuard>
                          <PermissionGuard permission="vendor:delete">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => setDeleting(vendor)}
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

      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vendor' : 'Create New Vendor'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update vendor details, banking information, and tax ID.'
                : 'Register a vendor with contact, banking, and tax details.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <VendorFormFields formData={formData} setFormData={setFormData} />
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Vendor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              {`Delete ${deleting?.name ?? 'this vendor'}? Vendors referenced by disbursement requests cannot be deleted.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Vendor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
