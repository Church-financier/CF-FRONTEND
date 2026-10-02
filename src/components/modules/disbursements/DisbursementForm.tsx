'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { formatVendorId } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuthStore } from '@/store/useAuthStore';
import { hasPermission } from '@/lib/permissions';

interface Vendor {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  headId?: string | null;
}

function formatVendorOption(vendor: Vendor): string {
  return `${vendor.name} (${formatVendorId(vendor.id)})`;
}

export interface DisbursementLineItem {
  description: string;
  amountInKobo: number;
  receiptUrl?: string;
}

export interface DisbursementFormPayload {
  purpose: string;
  amountInKobo: number;
  vendorId?: string;
  departmentId?: string;
  lineItems?: DisbursementLineItem[];
}

export function DisbursementForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (data: DisbursementFormPayload) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { format, code, toMinorUnits, inputStep } = useCurrency();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [formData, setFormData] = useState({
    purpose: '',
    amountInKobo: '',
    vendorId: '',
    departmentId: '',
  });
  const [lineItems, setLineItems] = useState<Array<{ description: string; amountInKobo: string }>>([
    { description: '', amountInKobo: '' },
  ]);
  const { user } = useAuthStore();
  const isDepartmentHead = user?.role === 'DEPARTMENT_HEAD';
  const canViewVendors = hasPermission(user?.role, 'vendor:read');

  useEffect(() => {
    if (!canViewVendors) return;
    setLoadingVendors(true);
    apiFetch<{ data: Vendor[]; total: number }>('/vendors?page=1&pageSize=100')
      .then((data) => setVendors(data.data))
      .catch(() => setVendors([]))
      .finally(() => setLoadingVendors(false));
  }, [canViewVendors]);

  useEffect(() => {
    setLoadingDepartments(true);
    apiFetch<{ data: Department[]; total: number }>('/departments?page=1&pageSize=100')
      .then((data) => setDepartments(data.data))
      .catch(() => setDepartments([]))
      .finally(() => setLoadingDepartments(false));
  }, []);

  const availableDepartments = useMemo(
    () => (isDepartmentHead ? departments.filter((d) => d.headId === user?.id) : departments),
    [departments, isDepartmentHead, user?.id]
  );

  const selectedDepartment = availableDepartments.find((d) => d.id === formData.departmentId);

  useEffect(() => {
    if (isDepartmentHead && !selectedDepartment && availableDepartments.length > 0) {
      setFormData((f) => ({ ...f, departmentId: availableDepartments[0].id }));
    }
  }, [isDepartmentHead, selectedDepartment, availableDepartments]);

  const totalKobo = lineItems.reduce((sum, li) => {
    return sum + (li.amountInKobo ? toMinorUnits(li.amountInKobo) : 0);
  }, 0);
  const headerKobo = formData.amountInKobo ? toMinorUnits(formData.amountInKobo) : 0;
  const mismatched = headerKobo > 0 && headerKobo !== totalKobo;

  const addLine = () => setLineItems([...lineItems, { description: '', amountInKobo: '' }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: 'description' | 'amountInKobo', value: string) => {
    setLineItems(lineItems.map((li, idx) => (idx === i ? { ...li, [key]: value } : li)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatched) return;

    const cleanedLineItems = lineItems
      .filter((li) => li.description && li.amountInKobo)
      .map((li) => ({
        description: li.description,
        amountInKobo: toMinorUnits(li.amountInKobo),
      }));

    onSubmit({
      purpose: formData.purpose,
      amountInKobo: headerKobo,
      vendorId: formData.vendorId || undefined,
      departmentId: formData.departmentId || undefined,
      lineItems: cleanedLineItems.length > 0 ? cleanedLineItems : undefined,
    });
    setFormData({ purpose: '', amountInKobo: '', vendorId: '', departmentId: '' });
    setLineItems([{ description: '', amountInKobo: '' }]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        New Disbursement
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Disbursement Request</DialogTitle>
          <DialogDescription>Submit a new expense request for approval</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Purpose</label>
            <Input
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Total Amount ({code})
            </label>
            <Input
              type="number"
              step={inputStep}
              value={formData.amountInKobo}
              onChange={(e) => setFormData({ ...formData, amountInKobo: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {canViewVendors && (
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Vendor</label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
                >
                  <option value="">Select a vendor</option>
                  {loadingVendors && <option disabled>Loading vendors...</option>}
                  {!loadingVendors &&
                    vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {formatVendorOption(vendor)}
                      </option>
                    ))}
                </select>
                {!loadingVendors && vendors.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">No vendors available.</p>
                )}
              </div>
            )}
            <div className={canViewVendors ? '' : 'sm:col-span-2'}>
              <label className="block text-sm font-medium text-navy-700 mb-1">Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                disabled={isDepartmentHead}
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm disabled:bg-navy-50 disabled:text-navy-600"
              >
                <option value="">Select a department</option>
                {loadingDepartments && <option disabled>Loading departments...</option>}
                {!loadingDepartments &&
                  availableDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
              </select>
              {!loadingDepartments && availableDepartments.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  {isDepartmentHead
                    ? 'You are not assigned to a department. Contact an administrator.'
                    : 'No departments available.'}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-navy-700">Line Items</label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                + Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-12 sm:col-span-7">
                    <Input
                      placeholder="Description"
                      value={li.description}
                      onChange={(e) => updateLine(i, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-9 sm:col-span-4">
                    <Input
                      type="number"
                      step={inputStep}
                      placeholder={`Amount (${code})`}
                      value={li.amountInKobo}
                      onChange={(e) => updateLine(i, 'amountInKobo', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      aria-label={`Remove line item ${i + 1}`}
                      onClick={() => removeLine(i)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {mismatched && (
              <p className="mt-2 text-xs text-red-600">
                Line items total ({format(totalKobo)}) does not match the header amount ({format(headerKobo)})
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled || mismatched}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
