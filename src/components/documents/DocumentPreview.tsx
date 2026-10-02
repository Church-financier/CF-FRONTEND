'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiDownload } from '@/lib/api';

/**
 * Organization branding as shown on generated documents.
 * Mirrors `OrgBranding` on the backend so an HTML print template and the
 * server-rendered PDF say the same things.
 */
export interface DocumentBranding {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  currency?: string | null;
  timezone?: string | null;
}

export interface DocumentMetadata {
  label: string;
  value: string;
}

export interface DocumentSignature {
  role: string;
  hint?: string;
  name?: string;
}

export interface DocumentTableColumn {
  header: string;
  /** Percentage of the table width, e.g. 30. */
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface DocumentTableRow {
  cells: string[];
  kind?: 'data' | 'total';
}

export interface DocumentDefinition {
  label: string;
  value: string;
  emphasis?: boolean;
}

/** Format a SHA-256 hex digest into 4-character blocks for legibility. */
export function formatVerificationHash(hash: string): string {
  return hash.match(/.{1,4}/g)?.join(' ') ?? hash;
}

/**
 * Build the monogram shown when an organization has no logo configured.
 * Two letters reads better than one at small print sizes.
 */
export function monogramFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** The organization's contact line, e.g. "12 Allen Ave | +234 800 000 0000 | a@b.org". */
export function contactLineFor(branding: DocumentBranding): string {
  return [branding.address, branding.phone, branding.email]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join('  |  ');
}

export interface OrgHeaderProps {
  branding: DocumentBranding;
  documentTitle: string;
  reference: string;
  referenceLabel?: string;
}

/** Navy organization header with a logo or monogram placeholder. */
export function OrgHeader({ branding, documentTitle, reference, referenceLabel = 'Reference' }: OrgHeaderProps) {
  const contact = contactLineFor(branding);
  return (
    <div className="print-doc-header">
      <div className="print-doc-logo" aria-hidden="true">
        {branding.logoUrl ? (
          // A configured logo that fails to load must not leave a broken image
          // on a legal document, so fall back to the monogram.
          <img src={branding.logoUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        ) : (
          monogramFor(branding.name)
        )}
      </div>
      <div className="print-doc-org">
        <div className="print-doc-org-name print-truncate">{branding.name}</div>
        <div className="print-doc-title">{documentTitle}</div>
        {contact ? <div className="print-doc-contact">{contact}</div> : null}
      </div>
      <div className="print-doc-ref">
        <div className="print-doc-ref-label">{referenceLabel}</div>
        <div className="print-doc-ref-value">{reference}</div>
        <div className="print-doc-ref-label" style={{ marginTop: 4 }}>Official document</div>
      </div>
    </div>
  );
}

export function MetadataBar({ items }: { items: DocumentMetadata[] }) {
  return (
    <div className="print-meta-bar">
      {items.map((item) => (
        <div className="print-meta-cell" key={item.label}>
          <div className="print-meta-label">{item.label}</div>
          <div className="print-meta-value print-truncate">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  APPROVED: 'var(--print-success)',
  PAID: 'var(--print-success)',
  COMPLETED: 'var(--print-success)',
  PENDING: 'var(--print-warning)',
  FIRST_APPROVED: 'var(--print-warning)',
  SUBMITTED: 'var(--print-warning)',
  REJECTED: 'var(--print-danger)',
  CANCELLED: 'var(--print-danger)',
};

export function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  return (
    <div className="print-status-row">
      <span className="print-status-label">Status</span>
      <span className="print-status-badge" style={{ background: STATUS_TONES[upper] ?? 'var(--print-muted)' }}>
        {upper}
      </span>
    </div>
  );
}

export function TotalBanner({ label, amount, note }: { label: string; amount: string; note?: string }) {
  return (
    <div className="print-total-banner">
      <div className="print-total-label">{label}</div>
      <div className="print-total-amount">{amount}</div>
      {note ? <div className="print-total-note">{note}</div> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="print-section-title">{children}</div>;
}

export function DocumentTable({
  columns,
  rows,
  totalRow,
}: {
  columns: DocumentTableColumn[];
  rows: DocumentTableRow[];
  totalRow?: DocumentTableRow;
}) {
  return (
    <table className="print-table">
      <colgroup>
        {columns.map((column) => (
          <col key={column.header} style={{ width: `${column.width}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.header}
              className={column.align === 'right' ? 'print-num' : column.align === 'center' ? 'print-center' : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {row.cells.map((cell, cellIndex) => {
              const column = columns[cellIndex];
              return (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={column?.align === 'right' ? 'print-num' : column?.align === 'center' ? 'print-center' : undefined}
                >
                  {cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
      {totalRow ? (
        <tfoot>
          <tr>
            {totalRow.cells.map((cell, cellIndex) => {
              const column = columns[cellIndex];
              return (
                <td
                  key={`total-${cellIndex}`}
                  className={column?.align === 'right' ? 'print-num' : column?.align === 'center' ? 'print-center' : undefined}
                >
                  {cell}
                </td>
              );
            })}
          </tr>
        </tfoot>
      ) : null}
    </table>
  );
}

export function DefinitionList({ entries }: { entries: DocumentDefinition[] }) {
  return (
    <div className="print-definitions">
      {entries.map((entry) => (
        <div key={entry.label}>
          <div className="print-def-label">{entry.label}</div>
          <div className="print-def-value">{entry.emphasis ? <strong>{entry.value}</strong> : entry.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

export function AuditFooter({
  signatures,
  qrDataUrl,
  hash,
}: {
  signatures: DocumentSignature[];
  qrDataUrl?: string | null;
  hash?: string;
}) {
  return (
    <div className="print-audit-footer">
      <div className="print-signatures">
        {signatures.map((signature) => (
          <div className="print-signature" key={signature.role}>
            <div className="print-signature-rule" />
            <div className="print-signature-role">{signature.role}</div>
            {signature.hint ? <div className="print-signature-hint">{signature.hint}</div> : null}
            {signature.name ? <div className="print-signature-name">{signature.name}</div> : null}
          </div>
        ))}
      </div>
      <div className="print-verification">
        {qrDataUrl ? (
          <img className="print-qr" src={qrDataUrl} alt="Verification code" />
        ) : (
          <div className="print-qr" aria-hidden="true" />
        )}
        <div className="print-verification-label">Scan to verify</div>
        {hash ? <div className="print-verification-hash">{formatVerificationHash(hash).slice(0, 44)}</div> : null}
      </div>
    </div>
  );
}

export function FooterStrip({ printedAt, timezone }: { printedAt: string; timezone: string }) {
  return (
    <div className="print-footer-strip">
      Generated by Church Financier — Executive Financial Suite
      <br />
      Printed {printedAt} ({timezone}) · This document is valid without a wet signature when electronically verified.
    </div>
  );
}

export interface DocumentPreviewProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  printedAt: string;
  timezone: string;
  /** Endpoint serving the authoritative server-rendered PDF. */
  pdfEndpoint: string;
  defaultPdfFilename: string;
}

/**
 * Shell around a document template: renders the A4 sheet on screen, offers
 * Print and PDF actions, and marks all surrounding chrome as non-printable so
 * only the sheet reaches the paper.
 */
export function DocumentPreview({
  title,
  children,
  onClose,
  printedAt,
  timezone,
  pdfEndpoint,
  defaultPdfFilename,
}: DocumentPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    // The server-rendered PDF is the authoritative, high-fidelity version, so
    // "Download" hands the user that rather than a screenshot of the sheet.
    setDownloading(true);
    setDownloadError(null);
    try {
      await apiDownload(pdfEndpoint, defaultPdfFilename);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download the PDF');
    } finally {
      setDownloading(false);
    }
  }, [pdfEndpoint, defaultPdfFilename]);

  return (
    <div className="print-root">
      <div className="flex items-center justify-between gap-3 border-b border-navy-200 bg-white px-4 py-3" data-print-hide>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
          <p className="text-xs text-navy-500">Review, then print or save as PDF.</p>
          {downloadError ? <p className="mt-1 text-xs text-red-600">{downloadError}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={downloading} data-print-hide>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
          <Button size="sm" onClick={handlePrint} data-print-hide>
            Print
          </Button>
          {onClose ? (
            <Button size="sm" variant="ghost" onClick={onClose} data-print-hide>
              Close
            </Button>
          ) : null}
        </div>
      </div>
      <div className="bg-navy-50 p-4">
        <div className="print-sheet">
          {children}
          <FooterStrip printedAt={printedAt} timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
