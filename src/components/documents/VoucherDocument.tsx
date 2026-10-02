'use client';

import {
  AuditFooter,
  DefinitionList,
  DocumentPreview,
  DocumentTable,
  MetadataBar,
  OrgHeader,
  SectionTitle,
  TotalBanner,
  type DocumentTableColumn,
} from './DocumentPreview';
import { normalizeCurrencyCode } from '@/lib/currency';

/** Voucher data as returned by `GET /disbursements/:id/voucher.json`. */
export interface VoucherPayload {
  /** Disbursement request id; used to address the PDF endpoint. */
  requestId: string;
  voucherNumber: string;
  organization: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    timezone: string;
    currency: string;
  };
  paidAt: string;
  purpose: string;
  payeeName: string;
  payeeBankDetails: string[];
  amountInKobo: string;
  /** Server-formatted amount, e.g. "₦25,000.00". */
  amountFormatted: string;
  amountInWords: string;
  paymentMethod: string;
  paymentReference: string | null;
  paymentNotes: string | null;
  requestedBy: string;
  firstApprovedBy: string | null;
  secondApprovedBy: string | null;
  paidBy: string;
  status: string;
  lineItems: Array<{ description: string; amountInKobo: string; amountFormatted: string }>;
  /** SHA-256 digest computed server-side; identical on the printed PDF. */
  verificationHash: string;
}

const COLUMNS: DocumentTableColumn[] = [
  { header: 'Description', width: 62 },
  { header: 'Ref', width: 16, align: 'center' },
  { header: 'Amount', width: 22, align: 'right' },
];

export interface VoucherDocumentProps {
  voucher: VoucherPayload;
  printedAt: string;
  onClose: () => void;
}

/**
 * Payment voucher matching the server-rendered PDF: branded header, metadata
 * bar, amount banner with the amount in words, payee and authorization
 * details, line items, and a signature/verification footer.
 */
export function VoucherDocument({ voucher, printedAt, onClose }: VoucherDocumentProps) {
  const timezone = voucher.organization.timezone || 'Africa/Lagos';
  const currency = normalizeCurrencyCode(voucher.organization.currency);
  const amount = voucher.amountFormatted;
  const method = (voucher.paymentMethod || 'Not recorded').toUpperCase();

  const paidAt = new Date(voucher.paidAt);
  const dateLabel = Number.isNaN(paidAt.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: timezone,
      }).format(paidAt);

  return (
    <DocumentPreview
      title={`Voucher ${voucher.voucherNumber}`}
      printedAt={printedAt}
      timezone={timezone}
      pdfEndpoint={`/disbursements/${voucher.requestId}/voucher`}
      defaultPdfFilename={`payment-voucher-${voucher.voucherNumber}.pdf`}
      onClose={onClose}
    >
      <OrgHeader
        branding={voucher.organization}
        documentTitle="Payment Voucher"
        reference={voucher.voucherNumber}
        referenceLabel="Voucher No"
      />

      <MetadataBar
        items={[
          { label: 'Voucher No', value: voucher.voucherNumber },
          { label: 'Payment Date', value: dateLabel },
          { label: 'Payment Method', value: method },
          { label: 'Status', value: voucher.status },
        ]}
      />

      <TotalBanner
        label="Amount Paid"
        amount={amount}
        note={`${voucher.amountInWords} (${currency})`}
      />

      <SectionTitle>Payee &amp; Payment Details</SectionTitle>
      <DefinitionList
        entries={[
          { label: 'Payee', value: voucher.payeeName, emphasis: true },
          ...voucher.payeeBankDetails.map((detail) => ({ label: 'Payment Details', value: detail })),
          { label: 'Purpose', value: voucher.purpose },
          { label: 'Payment Reference', value: voucher.paymentReference || '—' },
          { label: 'Notes', value: voucher.paymentNotes || '—' },
        ]}
      />

      <SectionTitle>Line Items</SectionTitle>
      <DocumentTable
        columns={COLUMNS}
        rows={voucher.lineItems.map((item, index) => ({
          cells: [item.description, String(index + 1).padStart(2, '0'), item.amountFormatted],
        }))}
        totalRow={{ cells: ['TOTAL', '', amount] }}
      />

      <SectionTitle>Authorization Trail</SectionTitle>
      <DefinitionList
        entries={[
          { label: 'Requested By', value: voucher.requestedBy },
          { label: 'First Approval', value: voucher.firstApprovedBy || '—' },
          { label: 'Second Approval', value: voucher.secondApprovedBy || '—' },
          { label: 'Paid By', value: voucher.paidBy, emphasis: true },
          { label: 'Amount In Words', value: voucher.amountInWords },
        ]}
      />

      <AuditFooter
        signatures={[
          { role: 'Treasurer / Signatory', hint: 'Releasing officer', name: voucher.paidBy },
          { role: 'Received By / Payee', hint: 'Signature and date', name: voucher.payeeName },
        ]}
        hash={voucher.verificationHash}
      />
    </DocumentPreview>
  );
}
