'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CircleDollarSign,
  FileDown,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { SINGLE_INVOICE_AMOUNT_IDR } from '@/modules/billing/schemas';
import { formatDate } from '@/modules/dashboard/components/shared/dashboard-dates';

type Invoice = {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName?: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly status: 'paid' | 'voided' | 'unpaid';
  readonly paidAt: string | null;
  readonly dueAt: string | null;
  readonly billingNote: string | null;
  readonly paymentMethod: string;
  readonly version: number;
  readonly createdAt: string;
};

type Customer = { readonly id: string; readonly name: string; readonly slug: string };

const INVOICE_PAGE_SIZE = 100;

function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function invoiceDateTime(value: string): string {
  return new Date(`${value}T12:00:00+07:00`).toISOString();
}

const money = (n: number) => `Rp${new Intl.NumberFormat('id-ID').format(n)}`;

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<unknown>;
}

export function MonetizationControlCenterV2({
  organizationId,
  permissions,
}: {
  readonly organizationId: string;
  readonly permissions: readonly string[];
}) {
  const isPlatform =
    permissions.includes('platform.super_admin') || permissions.includes('platform.customer.admin');
  const [state, setState] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<readonly Invoice[]>([]);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(false);
  const [loadingMoreInvoices, setLoadingMoreInvoices] = useState(false);
  const [customers, setCustomers] = useState<readonly Customer[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [status, setStatus] = useState('active');
  const [amount, setAmount] = useState(String(SINGLE_INVOICE_AMOUNT_IDR));
  const [invoiceMode, setInvoiceMode] = useState<'unpaid' | 'paid'>('unpaid');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return localDateInputValue(date);
  });
  const [paidDate, setPaidDate] = useState(() => localDateInputValue());
  const [billingNote, setBillingNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transfer bank');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'paid' | 'unpaid' | 'voided'>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [s, i] = await Promise.all([
        getJson(
          `/api/dashboard/billing?scope=subscription-state&organizationId=${encodeURIComponent(organizationId)}`,
        ) as Promise<{ state: string }>,
        getJson(
          `/api/dashboard/billing?scope=invoices&organizationId=${encodeURIComponent(organizationId)}&limit=${INVOICE_PAGE_SIZE}`,
        ) as Promise<readonly Invoice[]>,
      ]);
      setState(s.state);
      setInvoices(i);
      setHasMoreInvoices(i.length >= INVOICE_PAGE_SIZE);
    } catch {
      setError('Gagal memuat data monetisasi.');
    } finally {
      setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!isPlatform) return;
    void getJson(
      `/api/dashboard/integrations?organizationId=${encodeURIComponent(organizationId)}&view=customers`,
    )
      .then((body) => {
        if (!Array.isArray(body)) return;
        setCustomers(
          body.flatMap((row): Customer[] => {
            if (typeof row !== 'object' || row === null) return [];
            const c = (row as { customer?: unknown }).customer;
            if (typeof c !== 'object' || c === null) return [];
            const x = c as Record<string, unknown>;
            return typeof x.id === 'string' && typeof x.name === 'string'
              ? [{ id: x.id, name: x.name, slug: typeof x.slug === 'string' ? x.slug : '' }]
              : [];
          }),
        );
      })
      .catch(() => setCustomers([]));
  }, [isPlatform, organizationId]);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.slug ? `${c.name} · ${c.slug}` : c.name })),
    [customers],
  );

  const loadMoreInvoices = async () => {
    const last = invoices[invoices.length - 1];
    if (last === undefined || loadingMoreInvoices || !hasMoreInvoices) return;
    setLoadingMoreInvoices(true);
    setError(null);
    try {
      const cursor = `${last.createdAt}~${last.id}`;
      const next = (await getJson(
        `/api/dashboard/billing?scope=invoices&organizationId=${encodeURIComponent(organizationId)}&limit=${INVOICE_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`,
      )) as readonly Invoice[];
      setInvoices((current) => {
        const known = new Set(current.map((invoice) => invoice.id));
        return [...current, ...next.filter((invoice) => !known.has(invoice.id))];
      });
      setHasMoreInvoices(next.length >= INVOICE_PAGE_SIZE);
    } catch {
      setError('Gagal memuat halaman faktur berikutnya.');
    } finally {
      setLoadingMoreInvoices(false);
    }
  };

  const command = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const r = await fetch('/api/dashboard/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    if (!r.ok) throw new Error('command failed');
    return r.json() as Promise<unknown>;
  }, []);

  const runAction = async (action: string, payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await command(action, payload);
      setNotice(success);
      await load();
    } catch {
      setError('Operasi monetisasi gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const paid = invoices.filter((i) => i.status === 'paid');
  const open = invoices.filter((i) => i.status === 'unpaid');
  const voided = invoices.filter((i) => i.status === 'voided');
  const overdue = open.filter((i) => i.dueAt !== null && Date.parse(i.dueAt) < nowMs);
  const dueSoon = open.filter(
    (i) =>
      i.dueAt !== null &&
      Date.parse(i.dueAt) >= nowMs &&
      Date.parse(i.dueAt) <= nowMs + 7 * 24 * 60 * 60 * 1000,
  );
  const paidValue = paid.reduce((n, i) => n + i.amountIdr, 0);
  const openValue = open.reduce((n, i) => n + i.amountIdr, 0);
  const overdueValue = overdue.reduce((n, i) => n + i.amountIdr, 0);
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = ledgerFilter === 'all' || invoice.status === ledgerFilter;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      needle.length === 0 ||
      invoice.number.toLowerCase().includes(needle) ||
      invoice.organizationId.toLowerCase().includes(needle);
    return matchesStatus && matchesQuery;
  });

  const customerName = (id: string) => {
    const customer = customers.find((c) => c.id === id);
    if (customer !== undefined) return customer.name;
    return 'Organisasi tidak tersedia';
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
            Monetization Control Center
          </p>
          <h1 className="m-0 mt-1 font-sans text-2xl font-semibold tracking-tight text-paper">
            Revenue & Billing
          </h1>
          <p className="m-0 mt-1 max-w-2xl text-xs leading-relaxed text-paper-dim">
            Satu workspace untuk status akses, nilai tagihan, dan tindakan billing yang
            terotorisasi.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={busy}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />{' '}
          Refresh
        </Button>
      </header>

      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}

      <section
        aria-label="Ringkasan finansial"
        className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {[
          [
            'Status',
            state === 'platform' ? 'Platform' : state === null ? 'Memuat…' : state,
            'Subscription lifecycle',
          ],
          ['Tertagih', money(paidValue), String(paid.length) + ' paid'],
          ['Piutang', money(openValue), String(open.length) + ' unpaid'],
          ['Jatuh tempo', money(overdueValue), String(overdue.length) + ' overdue'],
          ['Faktur', String(invoices.length), String(voided.length) + ' voided'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-lg border border-hairline bg-bg-raised p-4">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              {label}
            </p>
            <p className="m-0 mt-2 truncate font-mono text-lg font-semibold tabular-nums text-paper">
              {value}
            </p>
            <p className="m-0 mt-1 truncate text-[10px] text-paper-faint">{note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard icon={CircleDollarSign} title="Financial Posture" eyebrow="Decision support">
          <div className="space-y-3">
            {[
              { label: 'Paid', value: paidValue, count: paid.length },
              { label: 'Outstanding', value: openValue, count: open.length },
              { label: 'Overdue', value: overdueValue, count: overdue.length },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-bg p-3"
              >
                <div>
                  <p className="m-0 font-sans text-xs font-semibold text-paper">{item.label}</p>
                  <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">
                    {item.count} invoice
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-paper">
                  {money(item.value)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={TriangleAlert} title="Attention Queue" eyebrow="Billing exceptions">
          {overdue.length === 0 && dueSoon.length === 0 ? (
            <p className="m-0 flex items-center gap-2 text-xs text-emerald-300">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Tidak ada invoice jatuh tempo
              yang membutuhkan perhatian.
            </p>
          ) : (
            <div className="space-y-2">
              {overdue.slice(0, 4).map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => {
                    setLedgerFilter('unpaid');
                    setQuery(invoice.number);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 truncate font-mono text-xs text-paper">
                    {invoice.number}
                  </span>
                  <span className="flex-none font-mono text-[10px] text-rose-300">
                    {money(invoice.amountIdr)} · overdue
                  </span>
                </button>
              ))}
              {dueSoon.slice(0, 4).map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => {
                    setLedgerFilter('unpaid');
                    setQuery(invoice.number);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 truncate font-mono text-xs text-paper">
                    {invoice.number}
                  </span>
                  <span className="flex-none font-mono text-[10px] text-amber-200">
                    {money(invoice.amountIdr)} · ≤7 hari
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard
          icon={CircleDollarSign}
          title="Invoice Ledger"
          eyebrow="Filtered financial ledger"
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-paper-faint"
                aria-hidden="true"
              />
              <Input
                aria-label="Cari faktur"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nomor faktur atau organisasi…"
                className="pl-8 text-xs"
              />
            </div>
            <select
              aria-label="Filter status faktur"
              value={ledgerFilter}
              onChange={(e) => setLedgerFilter(e.target.value as typeof ledgerFilter)}
              className="h-9 rounded-md border border-hairline bg-bg px-2 text-xs text-paper"
            >
              <option value="all">Semua status</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="voided">Voided</option>
            </select>
          </div>
          {busy && invoices.length === 0 ? (
            <div role="status" aria-live="polite" className="rounded-lg border border-hairline bg-bg p-4 text-xs text-paper-dim">
              Memuat faktur…
            </div>
          ) : error !== null && invoices.length === 0 ? (
            <EmptyState compact title="Faktur tidak dapat dimuat. Periksa pesan kesalahan lalu coba refresh." />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState compact title={query.trim() || ledgerFilter !== 'all' ? 'Tidak ada faktur yang cocok dengan filter.' : 'Belum ada faktur untuk organisasi ini.'} />
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((invoice) => (
                <article key={invoice.id} className="rounded-lg border border-hairline bg-bg p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate font-mono text-xs font-semibold text-paper">
                        {invoice.number}
                      </p>
                      <p className="m-0 mt-1 text-[11px] text-paper-dim">
                        Diterbitkan {formatDate(invoice.createdAt)} · {invoice.organizationName || customerName(invoice.organizationId)}
                      </p>
                      {invoice.dueAt ? (
                        <p className="m-0 mt-1 text-[10px] text-paper-faint">Jatuh tempo {formatDate(invoice.dueAt)}</p>
                      ) : null}
                      {invoice.billingNote ? (
                        <p className="m-0 mt-1 line-clamp-2 text-[11px] text-paper-dim">{invoice.billingNote}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums text-paper">
                      {money(invoice.amountIdr)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/api/dashboard/billing/invoice/${invoice.id}?organizationId=${encodeURIComponent(invoice.organizationId)}`,
                            '_blank',
                            'noopener',
                          )
                        }
                      >
                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" /> Unduh
                      </Button>
                      {isPlatform && invoice.status === 'unpaid' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            const date = window.prompt(
                              `Tanggal pembayaran ${invoice.number} (YYYY-MM-DD):`,
                              localDateInputValue(),
                            );
                            if (!date || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return;
                            const method = window.prompt('Metode pembayaran:', 'Transfer bank');
                            if (!method?.trim()) return;
                            if (!window.confirm(`Konfirmasi pembayaran ${invoice.number} sebesar ${money(invoice.amountIdr)}?`)) return;
                            void runAction(
                              'invoice.pay',
                              {
                                invoiceId: invoice.id,
                                expectedVersion: invoice.version,
                                paidAt: invoiceDateTime(date),
                                paymentMethod: method.trim(),
                              },
                              'Pembayaran invoice berhasil dicatat.',
                            );
                          }}
                        >
                          Tandai lunas
                        </Button>
                      ) : null}
                      {isPlatform && invoice.status === 'paid' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt(`Alasan batal ${invoice.number}:`);
                            if (reason?.trim())
                              void runAction(
                                'invoice.void',
                                {
                                  invoiceId: invoice.id,
                                  expectedVersion: invoice.version,
                                  reason: reason.trim(),
                                },
                                'Faktur dibatalkan.',
                              );
                          }}
                        >
                          Batalkan
                        </Button>
                      ) : null}
                      {isPlatform && invoice.status === 'voided' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt(
                              `Alasan terbitkan ulang ${invoice.number}:`,
                            );
                            if (reason?.trim())
                              void runAction(
                                'invoice.reissue',
                                {
                                  invoiceId: invoice.id,
                                  expectedVersion: invoice.version,
                                  reason: reason.trim(),
                                },
                                'Faktur pengganti diterbitkan.',
                              );
                          }}
                        >
                          Terbitkan ulang
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {hasMoreInvoices ? (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadMoreInvoices()}
                disabled={loadingMoreInvoices || busy}
              >
                {loadingMoreInvoices ? 'Memuat faktur…' : 'Muat faktur berikutnya'}
              </Button>
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard icon={BadgeCheck} title="Access State" eyebrow="Status organisasi">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="font-sans text-sm font-semibold text-paper">
                {state ?? 'Memuat…'}
              </span>
            </div>
            {state && !['active', 'platform'].includes(state) ? (
              <p className="m-0 mt-3 flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                <TriangleAlert className="h-3.5 w-3.5 flex-none" aria-hidden="true" /> Akses
                organisasi membutuhkan perhatian.
              </p>
            ) : null}
          </SectionCard>

          {isPlatform ? (
            <SectionCard
              icon={ShieldCheck}
              title="Platform Actions"
              eyebrow="Tindakan terotorisasi"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monetization-org">Organisasi</Label>
                  <SearchCombobox
                    id="monetization-org"
                    value={selectedOrg}
                    onValueChange={(v) => setSelectedOrg(v ?? '')}
                    options={customerOptions}
                    placeholder="Pilih organisasi…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monetization-status">Status</Label>
                  <select
                    id="monetization-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={busy}
                    className="h-9 w-full rounded-md border border-hairline bg-bg px-2 text-xs text-paper"
                  >
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !selectedOrg}
                  onClick={() => {
                    if (window.confirm(`Ubah akses ${customerName(selectedOrg)} → ${status}?`)) {
                      void runAction(
                        'subscription.update',
                        { organizationId: selectedOrg, status },
                        'Status langganan diperbarui.',
                      );
                    }
                  }}
                >
                  Terapkan status
                </Button>
                <div className="border-t border-hairline pt-4">
                  <p className="m-0 mb-3 text-xs font-semibold text-paper">Buat invoice khusus</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="monetization-invoice-mode">Jenis invoice</Label>
                    <select
                      id="monetization-invoice-mode"
                      value={invoiceMode}
                      onChange={(e) => setInvoiceMode(e.target.value as typeof invoiceMode)}
                      disabled={busy}
                      className="h-9 w-full rounded-md border border-hairline bg-bg px-2 text-xs text-paper"
                    >
                      <option value="unpaid">Tagihan baru · belum dibayar</option>
                      <option value="paid">Invoice lunas · pembayaran terkonfirmasi</option>
                    </select>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="monetization-amount">Nominal (IDR)</Label>
                    <Input
                      id="monetization-amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={busy}
                      inputMode="numeric"
                      className="font-mono text-xs"
                    />
                    <p className="m-0 text-[10px] text-paper-faint">
                      Nilai awal {money(SINGLE_INVOICE_AMOUNT_IDR)}; dapat disesuaikan untuk setiap UPT.
                    </p>
                  </div>
                  {invoiceMode === 'unpaid' ? (
                    <div className="mt-3 space-y-1.5">
                      <Label htmlFor="monetization-due-date">Tanggal jatuh tempo</Label>
                      <Input
                        id="monetization-due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={busy}
                        required
                      />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1.5">
                      <Label htmlFor="monetization-paid-date">Tanggal pembayaran</Label>
                      <Input
                        id="monetization-paid-date"
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        disabled={busy}
                        required
                      />
                      <Label htmlFor="monetization-payment-method">Metode pembayaran</Label>
                      <Input
                        id="monetization-payment-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        disabled={busy}
                        maxLength={40}
                      />
                    </div>
                  )}
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="monetization-billing-note">Keterangan / periode layanan</Label>
                    <textarea
                      id="monetization-billing-note"
                      value={billingNote}
                      onChange={(e) => setBillingNote(e.target.value)}
                      disabled={busy}
                      maxLength={500}
                      rows={3}
                      placeholder="Contoh: Layanan distribusi konten UPT — Oktober 2026"
                      className="w-full rounded-md border border-hairline bg-bg px-3 py-2 text-xs text-paper placeholder:text-paper-faint"
                    />
                    <p className="m-0 text-[10px] text-paper-faint">
                      Tanggal penerbitan dan nomor invoice dibuat otomatis saat invoice diterbitkan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    disabled={busy || !selectedOrg || !amount.trim() || (invoiceMode === 'unpaid' ? !dueDate : !paidDate || !paymentMethod.trim())}
                    onClick={() => {
                      const n = Number(amount);
                      if (!Number.isSafeInteger(n) || n < 1) {
                        setError('Nominal invoice harus berupa bilangan bulat positif.');
                        return;
                      }
                      if (invoiceMode === 'unpaid' && invoiceDateTime(dueDate) <= new Date().toISOString()) {
                        setError('Tanggal jatuh tempo harus berada di masa depan.');
                        return;
                      }
                      const action = invoiceMode === 'unpaid' ? 'invoice.issue' : 'invoice.create';
                      const payload = invoiceMode === 'unpaid'
                        ? {
                            organizationId: selectedOrg,
                            amountIdr: n,
                            dueAt: invoiceDateTime(dueDate),
                            billingNote: billingNote.trim() || null,
                          }
                        : {
                            organizationId: selectedOrg,
                            amountIdr: n,
                            paidAt: invoiceDateTime(paidDate),
                            billingNote: billingNote.trim() || null,
                            paymentMethod: paymentMethod.trim(),
                          };
                      const actionLabel = invoiceMode === 'unpaid' ? 'Terbitkan tagihan' : 'Catat invoice lunas';
                      if (window.confirm(`${actionLabel} untuk ${customerName(selectedOrg)} sebesar ${money(n)}?`)) {
                        void runAction(action, payload, invoiceMode === 'unpaid' ? 'Tagihan berhasil diterbitkan.' : 'Invoice lunas berhasil dicatat.');
                      }
                    }}
                  >
                    {invoiceMode === 'unpaid' ? 'Terbitkan tagihan' : 'Catat invoice lunas'}
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
