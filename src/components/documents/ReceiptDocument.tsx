'use client';

import {
  AuditFooter,
  DefinitionList,
  DocumentPreview,
  DocumentTable,
  MetadataBar,
  OrgHeader,
  SectionTitle,
  StatusBadge,
  TotalBanner,
  type DocumentTableColumn,
} from './DocumentPreview';
import { normalizeCurrencyCode } from '@/lib/currency';

/** A contribution as returned by `GET /contributions/:id/receipt`. */
export interface ReceiptPayload {
  entryId: string;
  receiptNumber: string;
  fundId: string;
  fundName: string;
  amountInKobo: string;
  /** Server-formatted amount, e.g. "₦1,500.00". */
  amountFormatted: string;
  date: string;
  description: string;
  contributionMethod: string | null;
  notes: string | null;
  recordedBy: { name: string; email: string } | string | null;
  payerName?: string | null;
  /** SHA-256 digest computed server-side; identical on the printed PDF. */
  verificationHash: string;
  status: string;
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
}

const COLUMNS: DocumentTableColumn[] = [
  { header: 'Item Description', width: 34 },
  { header: 'Category / Fund', width: 18 },
  { header: 'Quantity', width: 10, align: 'center' },
  { header: 'Unit Price', width: 18, align: 'right' },
  { header: 'Amount', width: 20, align: 'right' },
];

export interface ReceiptDocumentProps {
  receipt: ReceiptPayload;
  printedAt: string;
  onClose: () => void;
}

/**
 * Enterprise-style e-Receipt, mirroring the server-rendered PDF: branded
 * header, metadata bar with status, total banner, itemised table, details
 * grid and a signature/verification footer.
 */
export function ReceiptDocument({ receipt, printedAt, onClose }: ReceiptDocumentProps) {
  const timezone = receipt.organization.timezone || 'Africa/Lagos';
  const currency = normalizeCurrencyCode(receipt.organization.currency);
  const amount = receipt.amountFormatted;
  const reference = receipt.receiptNumber;
  const status = (receipt.status || 'APPROVED').toUpperCase();
  const method = (receipt.contributionMethod || 'CASH').toUpperCase();
  const payer = receipt.payerName || 'Anonymous donor';
  const recordedBy =
    typeof receipt.recordedBy === 'string'
      ? receipt.recordedBy
      : receipt.recordedBy
        ? `${receipt.recordedBy.name} (${receipt.recordedBy.email})`
        : 'System';

  const transactionDate = new Date(receipt.date);
  const dateLabel = Number.isNaN(transactionDate.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
      }).format(transactionDate);

  return (
    <DocumentPreview
      title={`Receipt ${reference}`}
      printedAt={printedAt}
      timezone={timezone}
      pdfEndpoint={`/contributions/${receipt.entryId}/receipt.pdf`}
      defaultPdfFilename={`receipt-${reference}.pdf`}
      onClose={onClose}
    >
      <OrgHeader
        branding={receipt.organization}
        documentTitle="Payment Receipt"
        reference={reference}
        referenceLabel="Receipt No"
      />

      <MetadataBar
        items={[
          { label: 'Receipt No', value: reference },
          { label: 'Transaction Date', value: dateLabel },
          { label: 'Payment Method', value: method },
          { label: 'Received From', value: payer },
        ]}
      />
      <StatusBadge status={status} />

      <TotalBanner label="Total Paid" amount={amount} note={`${currency} · ${status}`} />

      <SectionTitle>Transaction Details</SectionTitle>
      <DocumentTable
        columns={COLUMNS}
        rows={[
          {
            cells: [receipt.description || 'Contribution received', receipt.fundName, '1', amount, amount],
          },
        ]}
        totalRow={{ cells: ['', '', '', 'TOTAL PAID', amount] }}
      />

      <SectionTitle>Record Information</SectionTitle>
      <DefinitionList
        entries={[
          { label: 'Receipt Number', value: reference, emphasis: true },
          { label: 'Reference', value: receipt.notes || receipt.entryId },
          { label: 'Fund / Category', value: receipt.fundName },
          { label: 'Payment Method', value: method },
          { label: 'Received From', value: payer },
          { label: 'Recorded By', value: recordedBy },
          { label: 'Status', value: status },
        ]}
      />

      <AuditFooter
        signatures={[
          { role: 'Authorized Signature', hint: 'Treasurer / Financial Secretary' },
          { role: 'Received By', hint: 'Donor / Representative', name: receipt.payerName || undefined },
        ]}
        hash={receipt.verificationHash}
      />
    </DocumentPreview>
  );
}
