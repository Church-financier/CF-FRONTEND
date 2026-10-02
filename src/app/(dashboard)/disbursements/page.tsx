'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { DisbursementForm, DisbursementFormPayload } from '@/components/modules/disbursements/DisbursementForm';
import { DisbursementApprovalDrawer, Disbursement } from '@/components/modules/disbursements/DisbursementApprovalDrawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VoucherDocument, type VoucherPayload } from '@/components/documents/VoucherDocument';
import { useCurrency } from '@/hooks/useCurrency';
import { apiFetch } from '@/lib/api';
import { useIdempotentSubmit } from '@/hooks/useIdempotentSubmit';
import { PermissionGuard } from '@/components/PermissionGuard';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColor: Record<Disbursement['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  FIRST_APPROVED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending first approval' },
  { value: 'FIRST_APPROVED', label: 'Awaiting final approval' },
  { value: 'APPROVED', label: 'Approved — awaiting payout' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled / Storno' },
];

export default function DisbursementsPage() {
  const { format, code } = useCurrency();
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [voucherLoadingId, setVoucherLoadingId] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<VoucherPayload | null>(null);
  const [printedAt, setPrintedAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadDisbursements = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (status) params.set('status', status);
      const data = await apiFetch<PaginatedResponse<Disbursement>>(`/disbursements?${params.toString()}`);
      setDisbursements(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disbursements');
      setDisbursements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadDisbursements();
  }, [loadDisbursements, refresh]);

  // Every mutating action here moves money, so each one carries an idempotency
  // key and ignores repeat clicks while in flight.
  const createDisbursement = useIdempotentSubmit(
    useCallback(async (key: string, data: DisbursementFormPayload) => {
      await apiFetch('/disbursements', {
        method: 'POST',
        body: JSON.stringify(data),
        idempotencyKey: key,
      });
    }, [])
  );

  const actionDisbursement = useIdempotentSubmit(
    useCallback(
      async (key: string, id: string, action: string, body?: unknown) => {
        await apiFetch(`/disbursements/${id}/${action}`, {
          method: 'PATCH',
          body: body === undefined ? undefined : JSON.stringify(body),
          idempotencyKey: key,
        });
      },
      []
    )
  );

  const handleCreate = async (data: DisbursementFormPayload) => {
    setError(null);
    setCreating(true);
    try {
      await createDisbursement.run(data);
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create disbursement');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = () => setRefresh((r) => r + 1);

  const runAction = async (id: string, action: string, body?: unknown) => {
    setError(null);
    setActingOn(id);
    try {
      await actionDisbursement.run(id, action, body);
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action.replace('-', ' ')}`);
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = (id: string, reason: string) => runAction(id, 'reject', { reason });
  const handleMarkPaid = (
    id: string,
    data: { paymentMethod: string; paymentReference?: string; paymentNotes?: string }
  ) => runAction(id, 'mark-paid', data);
  const handleCancel = (id: string, reason: string) => runAction(id, 'cancel', { reason });

  /**
   * Fetch the voucher document and show it in the print preview. The same
   * payload backs the PDF, so preview and download always agree.
   */
  const viewVoucher = async (id: string) => {
    try {
      setVoucherLoadingId(id);
      setError(null);
      const data = await apiFetch<VoucherPayload>(`/disbursements/${id}/voucher.json`);
      setPrintedAt(new Date().toISOString());
      setVoucher(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment voucher');
    } finally {
      setVoucherLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Disbursements"
        right={
          <PermissionGuard permission="disbursement:create">
            <DisbursementForm onSubmit={handleCreate} disabled={creating} />
          </PermissionGuard>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="text-sm font-medium text-navy-700" htmlFor="disbursement-status-filter">
          Filter by status
        </label>
        <select
          id="disbursement-status-filter"
          value={status}
          onChange={(e) => {
            setLoading(true);
            setStatus(e.target.value);
          }}
          className="w-full sm:w-64 h-9 rounded-md border border-navy-300 bg-white px-3 text-sm"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-white rounded-lg border border-navy-200 p-8 text-center">
          <div className="text-navy-900 font-medium">Loading disbursements...</div>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-navy-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-navy-50">
              <TableRow>
                <TableHead>Purpose</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Requestor</TableHead>
                <TableHead>Amount ({code})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approvers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disbursements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-navy-500">
                    No disbursements found
                  </TableCell>
                </TableRow>
              ) : (
                disbursements.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm text-navy-900">{d.purpose}</TableCell>
                    <TableCell className="text-sm text-navy-700">
                      {d.vendor?.name || d.department?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-navy-700">
                      {d.requestedBy?.name || d.requestedBy?.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-navy-900 font-medium">
                      {format(Number(d.amountInKobo))}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[d.status]}`}>
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-navy-600">
                      {d.firstApprovedBy?.name || '-'} / {d.secondApprovedBy?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {d.status === 'PAID' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewVoucher(d.id)}
                            disabled={voucherLoadingId === d.id}
                          >
                            {voucherLoadingId === d.id ? 'Loading...' : 'Voucher'}
                          </Button>
                        )}
                        <DisbursementApprovalDrawer
                          disbursement={d}
                          onAction={handleAction}
                          onReject={handleReject}
                          onMarkPaid={handleMarkPaid}
                          onCancel={handleCancel}
                          busy={actingOn === d.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {total > 0 && (
            <p className="px-4 py-3 text-xs text-navy-500 border-t border-navy-200">
              Showing {disbursements.length} of {total} disbursement{total === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}

      <Dialog
        open={!!voucher}
        onOpenChange={(open) => {
          if (!open) setVoucher(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          {voucher ? (
            <VoucherDocument
              voucher={voucher}
              printedAt={printedAt}
              onClose={() => setVoucher(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
