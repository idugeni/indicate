'use client';

import { useCallback, useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

interface InvoiceRow {
  readonly id: string;
  readonly organizationId: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly currency: string;
  readonly status: 'paid' | 'voided' | 'unpaid';
  readonly paidAt: string | null;
  readonly dueAt: string | null;
  readonly billingNote: string | null;
  readonly paymentMethod: string;
  readonly voidedAt: string | null;
  readonly voidReason: string | null;
  readonly version: number;
  readonly createdAt: string;
}

const formatIdr = (value: number) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d);
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...init });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

function stateLabel(state: string | null): string {
  if (state === null) return 'Memuat…';
  if (state === 'platform') return 'Platform — bebas';
  if (state === 'active') return 'Aktif';
  if (state === 'suspended') return 'Ditangguhkan';
  if (state === 'cancelled') return 'Dibatalkan';
  return `Terbatas (${state})`;
}

/**
 * Tampilkan status langganan dan faktur organisasi.
 *
 * @remarks Defer reload() to a microtask so the setState in effect stays async. Ambil versi berjalan agar update optimistis lolos; tanpa baris langganan, buat baru.
 */
export function BillingPanel({
  organizationId,
  permissions,
}: {
  readonly organizationId: string;
  readonly permissions: readonly string[];
}) {
  const isPlatform = permissions.includes('platform.super_admin') || permissions.includes('platform.customer.admin');
  const [state, setState] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<readonly InvoiceRow[]>([]);
  const [manualOrgId, setManualOrgId] = useState('');
  const [manualStatus, setManualStatus] = useState('active');
  const [invoiceOrgId, setInvoiceOrgId] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('550000');
  const [invoicePaidAt, setInvoicePaidAt] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [invoiceMethod, setInvoiceMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvoiceRow | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [stateBody, invoiceBody] = await Promise.all([
        api(
          `/api/dashboard/billing?scope=subscription-state&organizationId=${encodeURIComponent(organizationId)}`,
        ) as Promise<{ state: string }>,
        api(
          `/api/dashboard/billing?scope=invoices&organizationId=${encodeURIComponent(organizationId)}`,
        ) as Promise<readonly InvoiceRow[]>,
      ]);
      setState(stateBody.state);
      setInvoices(invoiceBody);
    } catch {
      setError('Gagal memuat status langganan.');
    } finally {
      setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const postBilling = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const body = (await api('/api/dashboard/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      })) as unknown;
      return body;
    },
    [],
  );

  const postIntegrations = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const body = (await api('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, action, payload }),
      })) as unknown;
      return body;
    },
    [organizationId],
  );

  const manualSetSubscription = async () => {
    const orgId = manualOrgId.trim();
    if (orgId === '') {
      setError('Isi UUID organisasi target dulu.');
      return;
    }
    if (!window.confirm(`Ubah status langganan? Org ${orgId} → ${manualStatus} (berlaku serta-merta, tanpa kedaluwarsa).`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const current = (await api(`/api/dashboard/integrations?organizationId=${encodeURIComponent(organizationId)}&view=customers&customerId=${encodeURIComponent(orgId)}`)) as {
        readonly subscription?: { readonly version?: number } | null;
      };
      const expectedVersion = current.subscription?.version;
      await postIntegrations('subscription.update', {
        organizationId: orgId,
        status: manualStatus,
        ...(expectedVersion === undefined ? {} : { expectedVersion }),
      });
      setNotice(`Status langganan tersimpan: ${manualStatus}.`);
      await reload();
    } catch {
      setError('Status langganan gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const createInvoice = async () => {
    const orgId = invoiceOrgId.trim();
    const amount = Number(invoiceAmount.trim());
    if (orgId === '' || !Number.isInteger(amount) || amount < 0) {
      setError('Isi UUID organisasi dan nominal yang valid.');
      return;
    }
    let paidAt = new Date().toISOString();
    if (invoicePaidAt.trim() !== '') {
      const parsed = new Date(`${invoicePaidAt.trim()}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        setError('Tanggal bayar tidak valid (format YYYY-MM-DD).');
        return;
      }
      paidAt = parsed.toISOString();
    }
    if (!window.confirm(`Catat invoice? Org ${orgId} · ${formatIdr(amount)} · bayar ${formatDate(paidAt)}.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postBilling('invoice.create', {
        organizationId: orgId,
        amountIdr: amount,
        paidAt,
        billingNote: invoiceNote.trim() === '' ? null : invoiceNote.trim(),
        paymentMethod: invoiceMethod.trim() === '' ? null : invoiceMethod.trim(),
      });
      setNotice('Invoice tercatat.');
      setInvoiceOrgId('');
      setInvoiceAmount('550000');
      setInvoicePaidAt('');
      setInvoiceNote('');
      setInvoiceMethod('');
      await reload();
    } catch {
      setError('Invoice gagal dicatat.');
    } finally {
      setBusy(false);
    }
  };

  const voidInvoice = async (invoice: InvoiceRow) => {
    const reason = window.prompt(`Alasan void invoice ${invoice.number}:`);
    if (reason === null || reason.trim() === '') return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postBilling('invoice.void', {
        invoiceId: invoice.id,
        expectedVersion: invoice.version,
        reason: reason.trim(),
      });
      setNotice(`Invoice ${invoice.number} di-void.`);
      await reload();
    } catch {
      setError('Void invoice gagal.');
    } finally {
      setBusy(false);
    }
  };

  const reissueInvoice = async (invoice: InvoiceRow) => {
    const reason = window.prompt(`Alasan terbitkan ulang invoice ${invoice.number}:`);
    if (reason === null || reason.trim() === '') return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postBilling('invoice.reissue', {
        invoiceId: invoice.id,
        expectedVersion: invoice.version,
        reason: reason.trim(),
      });
      setNotice(`Invoice pengganti ${invoice.number} terbit.`);
      await reload();
    } catch {
      setError('Terbitkan ulang invoice gagal.');
    } finally {
      setBusy(false);
    }
  };

  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const unpaidInvoices = invoices.filter((invoice) => invoice.status === 'unpaid');
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.amountIdr, 0);

  return (
    <div className="grid grid-cols-1 items-start gap-x-10 gap-y-8 md:grid-cols-2">
      <section aria-label="Status langganan" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Langganan</p>
        <p className="m-0 mt-2 font-sans text-lg font-semibold tracking-tight text-paper">
          {stateLabel(state)}
        </p>
        {state !== null && state !== 'platform' && state !== 'active' ? (
          <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
            Organisasi tidak aktif tidak bisa menulis atau menerbitkan. Hubungi administrator untuk aktivasi.
          </p>
        ) : null}
        {busy ? <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Memuat…</p> : null}
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
      </section>

      <section aria-label="Tentang aktivasi" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Aktivasi manual</p>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
          Tidak ada paket dan tidak ada masa aktif yang kedaluwarsa: pembelian lewat kontak langsung, lalu
          status diaktifkan di sini dan berjalan terus sampai diubah manual.
        </p>
      </section>

      <section aria-label="Ringkasan faktur" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Ringkasan faktur</p>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
          {invoices.length === 0
            ? 'Belum ada faktur tercatat untuk organisasi ini.'
            : `${invoices.length} faktur · ${paidInvoices.length} lunas (${formatIdr(paidTotal)}) · ${unpaidInvoices.length} belum bayar.`}
        </p>
      </section>

      <section aria-label="Faktur saya" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Faktur saya</p>
        <ul className="m-0 mt-2 grid list-none gap-0 p-0">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="border-b border-hairline py-3 last:border-b-0">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {invoice.number} — {formatIdr(invoice.amountIdr)} · {invoice.status === 'paid' ? 'Lunas' : invoice.status === 'unpaid' ? 'Belum bayar' : 'Void'}
              </p>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                {invoice.status === 'unpaid'
                  ? `Tempo ${invoice.dueAt === null ? '-' : formatDate(invoice.dueAt)}`
                  : `Bayar ${invoice.paidAt === null ? '-' : formatDate(invoice.paidAt)}`}
                {invoice.billingNote ? ` · ${invoice.billingNote}` : ''}
              </p>
              {invoice.status === 'voided' && invoice.voidReason ? (
                <p className="m-0 mt-0.5 font-sans text-xs text-error">Void: {invoice.voidReason}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreview(invoice)}
                  disabled={busy}
                  className="h-8 border border-hairline-strong px-3 font-sans text-xs text-paper hover:text-brass disabled:opacity-50"
                >
                  Pratinjau
                </button>
              </div>
              {isPlatform && invoice.status === 'paid' ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(`/api/dashboard/billing/invoice/${invoice.id}?organizationId=${encodeURIComponent(invoice.organizationId)}`, '_blank', 'noopener')}
                    disabled={busy}
                    className="h-8 border border-hairline-strong px-3 font-sans text-xs text-paper-dim hover:text-paper disabled:opacity-50"
                  >
                    Unduh
                  </button>
                  <button
                    type="button" onClick={() => void voidInvoice(invoice)} disabled={busy}
                    className="h-8 border border-error px-3 font-sans text-xs text-error disabled:opacity-50"
                  >
                    Void invoice
                  </button>
                </div>
              ) : isPlatform ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(`/api/dashboard/billing/invoice/${invoice.id}?organizationId=${encodeURIComponent(invoice.organizationId)}`, '_blank', 'noopener')}
                    disabled={busy}
                    className="h-8 border border-hairline-strong px-3 font-sans text-xs text-paper-dim hover:text-paper disabled:opacity-50"
                  >
                    Unduh
                  </button>
                  <button
                    type="button" onClick={() => void reissueInvoice(invoice)} disabled={busy}
                    className="h-8 border border-brass/60 px-3 font-sans text-xs text-paper-dim hover:text-paper disabled:opacity-50"
                  >
                    Terbitkan ulang
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => window.open(`/api/dashboard/billing/invoice/${invoice.id}?organizationId=${encodeURIComponent(invoice.organizationId)}`, '_blank', 'noopener')}
                    disabled={busy}
                    className="h-8 border border-hairline-strong px-3 font-sans text-xs text-paper-dim hover:text-paper disabled:opacity-50"
                  >
                    Unduh
                  </button>
                </div>
              )}
            </li>
          ))}
          {invoices.length === 0 ? <li className="py-3 font-sans text-sm text-paper-faint">Belum ada faktur.</li> : null}
        </ul>
      </section>

      {isPlatform ? (
        <section aria-label="Ubah status langganan" className="rounded-lg border border-brass/60 bg-bg-raised p-5 sm:p-6 md:col-span-2">
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Ubah status (pembayaran manual di luar sistem)</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="manual-org-id" className="font-sans text-xs font-medium text-paper-dim">
                UUID organisasi
              </label>
              <input
                id="manual-org-id" value={manualOrgId} onChange={(event) => setManualOrgId(event.target.value)} disabled={busy}
                placeholder="UUID organisasi target…" spellCheck={false}
                className="h-9 border border-hairline-strong bg-bg px-3 font-mono text-xs text-paper"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="manual-status" className="font-sans text-xs font-medium text-paper-dim">
                Status
              </label>
              <select
                id="manual-status" value={manualStatus} onChange={(event) => setManualStatus(event.target.value)} disabled={busy}
                className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              >
                <option value="active">Aktif (bisa dipakai)</option>
                <option value="suspended">Ditangguhkan</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button" onClick={() => void manualSetSubscription()} disabled={busy}
              className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
            >
              Terapkan status
            </button>
          </div>
        </section>
      ) : null}

      {isPlatform ? (
        <section aria-label="Catat invoice" className="rounded-lg border border-brass/60 bg-bg-raised p-5 sm:p-6 md:col-span-2">
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Catat invoice (pembayaran manual terkonfirmasi)</p>
          <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
            Nomor faktur format IND-{`{ORG}`}-{`{YYMM}`}-{`{SEQ}`}-{`{RAND}`} dibuat otomatis dan tidak bisa ditebak. Invoice tercatat langsung berstatus lunas.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-org-id" className="font-sans text-xs font-medium text-paper-dim">
                UUID organisasi
              </label>
              <input
                id="invoice-org-id" value={invoiceOrgId} onChange={(event) => setInvoiceOrgId(event.target.value)} disabled={busy}
                placeholder="UUID organisasi…" spellCheck={false}
                className="h-9 border border-hairline-strong bg-bg px-3 font-mono text-xs text-paper"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-amount" className="font-sans text-xs font-medium text-paper-dim">
                Nominal (Rp)
              </label>
              <input
                id="invoice-amount" value={invoiceAmount} readOnly disabled={busy}
                placeholder="550000" inputMode="numeric"
                className="h-9 border border-hairline-strong bg-bg px-3 font-mono text-xs text-paper"
              />
              <p className="m-0 font-sans text-xs text-paper-faint">Rp550.000/bulan — harga tunggal</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-paid-at" className="font-sans text-xs font-medium text-paper-dim">
                Tanggal bayar
              </label>
              <input
                id="invoice-paid-at" type="date" value={invoicePaidAt} onChange={(event) => setInvoicePaidAt(event.target.value)} disabled={busy}
                className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-note" className="font-sans text-xs font-medium text-paper-dim">
                Catatan (opsional)
              </label>
              <input
                id="invoice-note" value={invoiceNote} onChange={(event) => setInvoiceNote(event.target.value)} disabled={busy}
                placeholder="Bank, periode, keterangan…"
                className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-method" className="font-sans text-xs font-medium text-paper-dim">
                Metode (opsional)
              </label>
              <input
                id="invoice-method" value={invoiceMethod} onChange={(event) => setInvoiceMethod(event.target.value)} disabled={busy}
                placeholder="Transfer bank" spellCheck={false} maxLength={40}
                className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button" onClick={() => void createInvoice()} disabled={busy}
              className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
            >
              Catat invoice
            </button>
          </div>
        </section>
      ) : null}

      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="border border-hairline bg-bg-raised">
          <DialogTitle className="font-sans text-sm font-semibold text-paper">
            {preview === null ? 'Pratinjau faktur' : preview.number}
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-paper-dim">
            Stempel LUNAS dan paraf digital dibubuhkan otomatis pada dokumen unduhan.
          </DialogDescription>
          {preview === null ? null : (
            <dl className="m-0 space-y-2 font-sans text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-paper-faint">Nominal</dt>
                <dd className="m-0 font-mono tabular-nums text-paper">{formatIdr(preview.amountIdr)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-paper-faint">Status</dt>
                <dd className="m-0 text-paper">{preview.status === 'paid' ? 'Lunas' : preview.status === 'unpaid' ? 'Belum bayar' : 'Void'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-paper-faint">{preview.status === 'unpaid' ? 'Tempo' : 'Tanggal bayar'}</dt>
                <dd className="m-0 font-mono tabular-nums text-paper">
                  {preview.status === 'unpaid'
                    ? (preview.dueAt === null ? '-' : formatDate(preview.dueAt))
                    : (preview.paidAt === null ? '-' : formatDate(preview.paidAt))}
                </dd>
              </div>
              {preview.billingNote ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-paper-faint">Catatan</dt>
                  <dd className="m-0 text-right text-paper">{preview.billingNote}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-paper-faint">Metode</dt>
                <dd className="m-0 text-paper">{preview.paymentMethod}</dd>
              </div>
            </dl>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (preview !== null) {
                  window.open(`/api/dashboard/billing/invoice/${preview.id}?organizationId=${encodeURIComponent(preview.organizationId)}`, '_blank', 'noopener');
                }
              }}
              disabled={busy || preview === null}
              className="h-8 bg-brass px-3 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
            >
              Unduh dokumen
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
