'use client';

import { useEffect } from 'react';
import { onSocketEvent, offSocketEvent } from '@/store/useSocketStore';
import { useCurrency } from '@/hooks/useCurrency';

export function SocketToasts() {
  const { format } = useCurrency();

  useEffect(() => {
    const onDisbursementRequest = (payload: unknown) => {
      const data = payload as { request?: { id: string; purpose: string; amountInKobo: string | number } };
      const amount = data?.request?.amountInKobo;
      const purpose = data?.request?.purpose;
      const formatted = amount ? format(Number(amount)) : '';
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'info', message: `New disbursement request: ${purpose} ${formatted}` },
        })
      );
    };
    const onApproved = (payload: unknown) => {
      const data = payload as { request?: { id: string; status: string } };
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'success', message: `Disbursement ${data?.request?.id?.slice(0, 8)} is now ${data?.request?.status}` },
        })
      );
    };
    const onRejected = (payload: unknown) => {
      const data = payload as { request?: { id: string } };
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'error', message: `Disbursement ${data?.request?.id?.slice(0, 8)} was rejected` },
        })
      );
    };
    const onPaid = (payload: unknown) => {
      const data = payload as { request?: { id: string; paymentMethod: string } };
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'success', message: `Payment recorded for ${data?.request?.id?.slice(0, 8)} via ${data?.request?.paymentMethod}` },
        })
      );
    };
    const onContribution = (payload: unknown) => {
      const data = payload as { count?: number };
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'success', message: `${data?.count ?? 0} contribution(s) recorded` },
        })
      );
    };
    const onLedger = () => {
      window.dispatchEvent(
        new CustomEvent('app:toast', { detail: { type: 'info', message: 'Ledger updated' } })
      );
    };

    onSocketEvent('disbursement:approval_requested', onDisbursementRequest);
    onSocketEvent('disbursement:approved', onApproved);
    onSocketEvent('disbursement:first_approved', onApproved);
    onSocketEvent('disbursement:rejected', onRejected);
    onSocketEvent('disbursement:paid', onPaid);
    onSocketEvent('contribution:created', onContribution);
    onSocketEvent('ledger:created', onLedger);

    return () => {
      offSocketEvent('disbursement:approval_requested', onDisbursementRequest);
      offSocketEvent('disbursement:approved', onApproved);
      offSocketEvent('disbursement:first_approved', onApproved);
      offSocketEvent('disbursement:rejected', onRejected);
      offSocketEvent('disbursement:paid', onPaid);
      offSocketEvent('contribution:created', onContribution);
      offSocketEvent('ledger:created', onLedger);
    };
  }, [format]);

  return null;
}
