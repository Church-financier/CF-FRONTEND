'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/hooks/useCurrency';
import { canApproveDisbursement, DISBURSEMENT_APPROVER_ROLES, hasPermission, PermissionGuard } from '@/components/PermissionGuard';
import { apiFetch } from '@/lib/api';
import { useIdempotentSubmit } from '@/hooks/useIdempotentSubmit';
import { useAuthStore } from '@/store/useAuthStore';

export interface DisbursementLineItem {
  id: string;
  description: string;
  amountInKobo: string;
  receiptUrl: string | null;
}

export interface Disbursement {
  id: string;
  amountInKobo: string;
  purpose: string;
  status: 'PENDING' | 'FIRST_APPROVED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  vendorId: string | null;
  vendor?: { id: string; name: string } | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  requestedById: string;
  requestedBy?: { name: string; email: string } | null;
  firstApprovedBy?: { name: string; email: string } | null;
  firstApprovedById?: string | null;
  secondApprovedBy?: { name: string; email: string } | null;
  secondApprovedById?: string | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  createdAt: string;
  lineItems?: DisbursementLineItem[];
}

interface DisbursementApprovalDrawerProps {
  disbursement: Disbursement;
  onAction: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onMarkPaid: (id: string, data: { paymentMethod: string; paymentReference?: string; paymentNotes?: string }) => void;
  onCancel: (id: string, reason: string) => void;
  /** A disbursement action is already in flight for this row. */
  busy?: boolean;
}

export function DisbursementApprovalDrawer({
  disbursement,
  onAction,
  onReject,
  onMarkPaid,
  onCancel,
  busy = false,
}: DisbursementApprovalDrawerProps) {
  const [open, setOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [payForm, setPayForm] = useState({ paymentMethod: 'BANK_TRANSFER', paymentReference: '', paymentNotes: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const { format, code } = useCurrency();
  const { user } = useAuthStore();

  // Approval runs through the same idempotent submit as the payout, so a
  // double-clicked approval cannot be applied twice.
  const approve = useIdempotentSubmit(
    useCallback(
      async (key: string, endpoint: string) => {
        await apiFetch(`/disbursements/${disbursement.id}/${endpoint}`, {
          method: 'PATCH',
          idempotencyKey: key,
        });
      },
      [disbursement.id]
    )
  );

  const canApprove = canApproveDisbursement(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Treasurers hold the first-approval stage too; cancellation (storno) stays
  // a super-admin action, matching the route guard.
  const canFirstApprove = hasPermission(user?.role, 'disbursement:approve');
  const canSecondApprove = canApprove;
  const canReject = hasPermission(user?.role, 'disbursement:reject');
  const canCancel = isSuperAdmin && hasPermission(user?.role, 'disbursement:reject');
  const isOwnRequest = user?.id === disbursement.requestedById;
  const isFirstApprover = user?.id === disbursement.firstApprovedById;
  const disabled = busy || actionLoading || approve.pending;

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      if (disbursement.status === 'PENDING') {
        await approve.run('first-approve');
      } else if (disbursement.status === 'FIRST_APPROVED') {
        await approve.run('second-approve');
      }
      onAction(disbursement.id);
      setOpen(false);
    } catch {
      // The parent page surfaces the error; the drawer just stays open.
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim() || disabled) return;
    onReject(disbursement.id, rejectReason);
    setRejectOpen(false);
    setRejectReason('');
    setOpen(false);
  };

  const handleMarkPaid = () => {
    if (disabled) return;
    onMarkPaid(disbursement.id, payForm);
    setPaidOpen(false);
    setOpen(false);
  };

  const handleCancel = () => {
    if (!cancelReason.trim() || disabled) return;
    onCancel(disbursement.id, cancelReason);
    setCancelOpen(false);
    setCancelReason('');
    setOpen(false);
  };

  const approveLabel = disbursement.status === 'PENDING' ? 'First Approve' : disbursement.status === 'FIRST_APPROVED' ? 'Second Approve' : 'Approve';
  const showApprove =
    (disbursement.status === 'PENDING' && canFirstApprove && !isOwnRequest) ||
    (disbursement.status === 'FIRST_APPROVED' && canSecondApprove && !isFirstApprover);
  const showCancel = (disbursement.status === 'APPROVED' || disbursement.status === 'PAID') && canCancel;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={busy}>
        Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disbursement Review</DialogTitle>
            <DialogDescription>Review and action this disbursement request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">Purpose</p>
                <p className="text-sm text-navy-900">{disbursement.purpose}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">Amount ({code})</p>
                <p className="text-sm text-navy-900 font-medium">
                  {format(Number(disbursement.amountInKobo))}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">Status</p>
                <p className="text-sm text-navy-900">{disbursement.status}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">Payee</p>
                <p className="text-sm text-navy-900">
                  {disbursement.vendor?.name || disbursement.department?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">First Approved By</p>
                <p className="text-sm text-navy-900">{disbursement.firstApprovedBy?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">Second Approved By</p>
                <p className="text-sm text-navy-900">{disbursement.secondApprovedBy?.name || '-'}</p>
              </div>
            </div>

            {disbursement.lineItems && disbursement.lineItems.length > 0 && (
              <div>
                <p className="text-xs text-navy-500 uppercase tracking-wider mb-1">Line Items</p>
                <ul className="text-sm space-y-1">
                  {disbursement.lineItems.map((li) => (
                    <li key={li.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                      <span className="text-navy-700">{li.description}</span>
                      <span className="text-navy-900 font-medium">{format(Number(li.amountInKobo))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <PermissionGuard allowedRoles={DISBURSEMENT_APPROVER_ROLES}>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-navy-200">
                {showApprove && (
                  <Button onClick={handleApprove} disabled={disabled}>
                    {approveLabel}
                  </Button>
                )}
                {(disbursement.status === 'PENDING' || disbursement.status === 'FIRST_APPROVED') && canReject && (
                  <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={disabled}>
                    Reject
                  </Button>
                )}
                {disbursement.status === 'APPROVED' && canApprove && (
                  <Button onClick={() => setPaidOpen(true)} disabled={disabled}>Mark as Paid</Button>
                )}
                {showCancel && (
                  <Button variant="destructive" onClick={() => setCancelOpen(true)} disabled={disabled}>
                    Storno / Cancel
                  </Button>
                )}
                {disbursement.status === 'PAID' && disbursement.paymentMethod && (
                  <p className="text-xs text-navy-600 self-center">
                    Paid {disbursement.paidAt ? new Date(disbursement.paidAt).toLocaleDateString() : ''} via {disbursement.paymentMethod}
                    {disbursement.paymentReference ? ` (ref: ${disbursement.paymentReference})` : ''}
                  </p>
                )}
              </div>
            </PermissionGuard>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Disbursement</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || disabled}>Confirm Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>Record payment details for this disbursement</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Payment Method</label>
              <select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                className="w-full h-9 rounded-md border border-navy-300 bg-white px-3 py-1 text-sm"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="POS">POS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Reference (optional)</label>
              <Input
                value={payForm.paymentReference}
                onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Notes (optional)</label>
              <Input
                value={payForm.paymentNotes}
                onChange={(e) => setPayForm({ ...payForm, paymentNotes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaidOpen(false)}>Cancel</Button>
              <Button onClick={handleMarkPaid} disabled={disabled}>Confirm Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Storno / Cancel Disbursement</DialogTitle>
            <DialogDescription>
              {disbursement.status === 'PAID'
                ? 'This will cancel the disbursement and create a reversal journal entry.'
                : 'This will cancel the approved disbursement.'}
              Provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              className="w-full h-24 rounded-md border border-navy-300 bg-white px-3 py-2 text-sm text-navy-900"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (required)"
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim() || disabled}>
                Confirm Storno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
