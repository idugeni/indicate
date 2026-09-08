'use client';

import { useCallback, useEffect, useState } from 'react';

import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

interface InvoiceRow {
  readonly id: string;
  readonly organizationId: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly currency: string;
  readonly status: 'paid' | 'voided';
  readonly paidAt: string;
  readonly billingNote: string | null;
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
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoicePaidAt, setInvoicePaidAt] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  // setState-in-effect: defer reload() to a microtask so setState stays async.
  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

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
      // Ambil versi berjalan agar update optimistis lolos; tanpa baris langganan, buat baru.
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
      await postIntegrations('invoice.create', {
        organizationId: orgId,
        amountIdr: amount,
        paidAt,
        billingNote: invoiceNote.trim() === '' ? null : invoiceNote.trim(),
      });
      setNotice('Invoice tercatat.');
      setInvoiceOrgId('');
      setInvoiceAmount('');
      setInvoicePaidAt('');
      setInvoiceNote('');
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
      await postIntegrations('invoice.void', {
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

      <section aria-label="Faktur saya" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Faktur saya</p>
        <ul className="m-0 mt-2 grid list-none gap-0 p-0">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="border-b border-hairline py-3 last:border-b-0">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {invoice.number} — {formatIdr(invoice.amountIdr)} · {invoice.status === 'paid' ? 'Lunas' : 'Void'}
              </p>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                Bayar {formatDate(invoice.paidAt)}
                {invoice.billingNote ? ` · ${invoice.billingNote}` : ''}
              </p>
              {invoice.status === 'voided' && invoice.voidReason ? (
                <p className="m-0 mt-0.5 font-sans text-xs text-error">Void: {invoice.voidReason}</p>
              ) : null}
              {isPlatform && invoice.status === 'paid' ? (
                <div className="mt-2">
                  <button
                    type="button" onClick={() => void voidInvoice(invoice)} disabled={busy}
                    className="h-8 border border-error px-3 font-sans text-xs text-error disabled:opacity-50"
                  >
                    Void invoice
                  </button>
                </div>
              ) : null}
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
            Nomor faktur dibuat otomatis berurutan per bulan (INV/YYYY/MM/NNNN). Invoice tercatat langsung berstatus lunas.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                id="invoice-amount" value={invoiceAmount} onChange={(event) => setInvoiceAmount(event.target.value)} disabled={busy}
                placeholder="550000" inputMode="numeric"
                className="h-9 border border-hairline-strong bg-bg px-3 font-mono text-xs text-paper"
              />
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
    </div>
  );
}
