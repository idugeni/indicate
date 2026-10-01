'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  FileText,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Timer,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SINGLE_INVOICE_AMOUNT_IDR } from '@/modules/billing/schemas';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { formatDate } from '@/modules/dashboard/components/shared/dashboard-dates';
import { AppTooltip } from '@/ui/app-tooltip';
import { Skeleton } from '@/components/ui/skeleton';

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

interface CustomerOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

function selectCustomerOptions(body: unknown): readonly CustomerOption[] {
  if (!Array.isArray(body)) return [];
  return body.flatMap((item): readonly CustomerOption[] => {
    if (typeof item !== 'object' || item === null) return [];
    const customer = (item as { readonly customer?: unknown }).customer;
    if (typeof customer !== 'object' || customer === null) return [];
    const row = customer as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string') return [];
    return [
      {
        id: row.id,
        name: row.name,
        slug: typeof row.slug === 'string' ? row.slug : '',
      },
    ];
  });
}

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
 * Render the organization subscription status and invoices.
 *
 * @remarks Defer reload() to a microtask so the setState in effect stays async. Read the running version so optimistic updates pass; without a subscription row, create a new one.
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
  const [invoiceAmount, setInvoiceAmount] = useState(String(SINGLE_INVOICE_AMOUNT_IDR));
  const [invoicePaidAt, setInvoicePaidAt] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [invoiceMethod, setInvoiceMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvoiceRow | null>(null);
  const [customers, setCustomers] = useState<readonly CustomerOption[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const isInitialLoading = state === null && invoices.length === 0 && error === null;

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

  useEffect(() => {
    if (!isPlatform) return;
    let cancelled = false;
    void (async () => {
      try {
        const body = await api(
          `/api/dashboard/integrations?organizationId=${encodeURIComponent(organizationId)}&view=customers`,
        );
        if (!cancelled) setCustomers(selectCustomerOptions(body));
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setCustomersLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPlatform, organizationId]);

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.slug === '' ? customer.name : `${customer.name} · ${customer.slug}`,
      })),
    [customers],
  );
  const hasCustomerOptions = customersLoaded && customerOptions.length > 0;
  const orgDisplayName = (id: string): string =>
    customers.find((customer) => customer.id === id)?.name ?? id;

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
      setError('Isi ID organisasi target dulu.');
      return;
    }
    if (!window.confirm(`Ubah status langganan? ${orgDisplayName(orgId)} → ${manualStatus} (berlaku segera, tanpa kedaluwarsa).`)) return;
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
    if (orgId === '' || !Number.isInteger(amount) || amount < 1) {
      setError('Isi ID organisasi dan nominal yang valid.');
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
    if (!window.confirm(`Catat faktur? ${orgDisplayName(orgId)} · ${formatIdr(amount)} · bayar ${formatDate(paidAt)}.`)) return;
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
      setNotice('Faktur tercatat.');
      setInvoiceOrgId('');
      setInvoiceAmount(String(SINGLE_INVOICE_AMOUNT_IDR));
      setInvoicePaidAt('');
      setInvoiceNote('');
      setInvoiceMethod('');
      await reload();
    } catch {
      setError('Faktur gagal dicatat.');
    } finally {
      setBusy(false);
    }
  };

  const voidInvoice = async (invoice: InvoiceRow) => {
    const reason = window.prompt(`Alasan batal tagihan ${invoice.number}:`);
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
      setNotice(`Tagihan ${invoice.number} dibatalkan.`);
      await reload();
    } catch {
      setError('Batalkan tagihan gagal.');
    } finally {
      setBusy(false);
    }
  };

  const reissueInvoice = async (invoice: InvoiceRow) => {
    const reason = window.prompt(`Alasan terbitkan ulang tagihan ${invoice.number}:`);
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
      setNotice(`Faktur pengganti ${invoice.number} terbit.`);
      await reload();
    } catch {
      setError('Terbitkan ulang faktur gagal.');
    } finally {
      setBusy(false);
    }
  };

  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const unpaidInvoices = invoices.filter((invoice) => invoice.status === 'unpaid');
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.amountIdr, 0);
  const openTotal = unpaidInvoices.reduce((sum, invoice) => sum + invoice.amountIdr, 0);

  const downloadInvoice = (invoice: InvoiceRow): void => {
    window.open(`/api/dashboard/billing/invoice/${invoice.id}?organizationId=${encodeURIComponent(invoice.organizationId)}`, '_blank', 'noopener');
  };

  return (
    <Tabs defaultValue="ringkasan" className="w-full">
      <TabsList aria-label="Bagian langganan" className="max-w-full overflow-x-auto overflow-y-clip">
        <TabsTrigger value="ringkasan" className="flex-none">
          <LayoutDashboard className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
          <span>Ringkasan</span>
        </TabsTrigger>
        <TabsTrigger value="faktur" className="flex-none">
          <Receipt className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
          <span>Faktur</span>
        </TabsTrigger>
        {isPlatform ? (
          <TabsTrigger value="admin" className="flex-none">
            <ShieldCheck className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>Admin</span>
          </TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent keepMounted value="ringkasan">
        <div className="space-y-4">
          <SectionCard icon={Wallet} title="Status Langganan" eyebrow="Paket manual">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                  Status akses organisasi
                </p>
                {isInitialLoading ? (
                  <span role="status" aria-label="Memuat status langganan" className="mt-1.5 block">
                    <Skeleton className="h-7 w-36 bg-bg-raised-2" />
                    <span className="sr-only">Memuat status langganan…</span>
                  </span>
                ) : (
                  <p className="m-0 mt-1 flex items-center gap-2 font-sans text-xl font-semibold tracking-tight text-paper">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 rounded-full ${
                        state === 'active' || state === 'platform'
                          ? 'bg-emerald-400'
                          : state === 'suspended'
                            ? 'bg-amber-400'
                            : state === 'cancelled'
                              ? 'bg-rose-400'
                              : 'bg-paper-faint'
                      }`}
                    />
                    {state === null ? 'Gagal dimuat' : stateLabel(state)}
                  </p>
                )}
              </div>
              {!isInitialLoading && state !== null ? (
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    state === 'active' || state === 'platform'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : state === 'suspended'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : state === 'cancelled'
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          : 'border-hairline-strong bg-bg text-paper-dim'
                  }`}
                >
                  {stateLabel(state)}
                </Badge>
              ) : null}
            </div>
            {state !== null && state !== 'platform' && state !== 'active' ? (
              <p className="m-0 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-sans text-[11px] leading-relaxed text-amber-200">
                Organisasi tidak aktif tidak bisa menulis atau menerbitkan. Hubungi administrator untuk aktivasi.
              </p>
            ) : null}
            {busy && !isInitialLoading ? (
              <p role="status" className="m-0 mt-2 animate-pulse font-sans text-[11px] text-paper-faint">
                Menyegarkan…
              </p>
            ) : null}
            {error ? <FormNotice tone="error">{error}</FormNotice> : null}
            {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
          </SectionCard>

          <SectionCard
            icon={Receipt}
            title="Ringkasan Faktur"
            eyebrow={`${invoices.length.toLocaleString('id-ID')} faktur`}
          >
            {isInitialLoading ? (
              <div role="status" aria-label="Memuat ringkasan faktur" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <span className="sr-only">Memuat ringkasan faktur…</span>
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="rounded-md border border-hairline bg-bg p-3" aria-hidden="true">
                    <Skeleton className="h-3 w-16 bg-bg-raised-2" />
                    <Skeleton className="mt-2 h-5 w-24 bg-bg-raised-2" />
                  </div>
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState compact title="Belum ada faktur tercatat untuk organisasi ini." className="mt-1" />
            ) : (
              <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Total tagihan', value: invoices.length.toLocaleString('id-ID'), icon: Receipt },
                  { label: 'Nilai lunas', value: formatIdr(paidTotal), icon: BadgeCheck },
                  { label: 'Belum bayar', value: formatIdr(openTotal), icon: Timer },
                  { label: 'Rincian', value: `${paidInvoices.length} lunas · ${unpaidInvoices.length} menunggu`, icon: FileText },
                ].map((stat) => (
                  <div key={stat.label} className="min-w-0 rounded-md border border-hairline bg-bg p-3 transition duration-150 hover:border-hairline-strong">
                    <dt className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                      <stat.icon className="h-3 w-3 flex-none text-brass" aria-hidden="true" />
                      <span className="truncate">{stat.label}</span>
                    </dt>
                    <dd className="m-0 mt-1.5 truncate font-mono text-sm font-semibold tabular-nums text-paper">
                      <AppTooltip label={stat.value} side="top">
                        <span className="block truncate">{stat.value}</span>
                      </AppTooltip>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </SectionCard>

          <section aria-label="Tentang aktivasi" className="rounded-lg border border-hairline bg-bg-raised px-4 py-3 sm:px-5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">Aktivasi manual</span>
            <p className="m-0 mt-1 font-sans text-[11px] leading-relaxed text-paper-dim">
              Tidak ada paket dan tidak ada masa aktif yang kedaluwarsa: pembelian lewat kontak langsung, lalu
              status diaktifkan di sini dan berjalan terus sampai diubah manual.
            </p>
          </section>
        </div>
      </TabsContent>
      <TabsContent keepMounted value="faktur">
        <SectionCard
          icon={Receipt}
          title="Daftar Faktur"
          eyebrow={`${invoices.length.toLocaleString('id-ID')} faktur · ${formatIdr(paidTotal + openTotal)} tercatat`}
        >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">Faktur saya</span>
          <span className="font-mono text-[11px] tabular-nums text-paper-dim">
            {invoices.length.toLocaleString('id-ID')} faktur · {formatIdr(paidTotal + openTotal)} tercatat
          </span>
        </div>
        {isInitialLoading ? (
          <div role="status" aria-label="Memuat daftar faktur" className="m-0 mt-1.5 grid list-none gap-0 p-0">
            <span className="sr-only">Memuat daftar faktur…</span>
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3 border-t border-hairline/60 py-2 first:border-t-0" aria-hidden="true">
                <Skeleton className="h-5 w-16 flex-none rounded-full bg-bg-raised-2" />
                <Skeleton className="h-3.5 min-w-0 flex-1 bg-bg-raised-2" />
                <Skeleton className="h-3 w-20 flex-none bg-bg-raised-2" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState compact title="Belum ada faktur. Catat lewat tab Admin." className="mt-1" />
        ) : (
        <ul className="m-0 mt-1.5 grid list-none gap-0 p-0">
          {invoices.map((invoice) => {
            const tone = invoice.status === 'paid' ? 'border-signal/40 text-signal' : invoice.status === 'unpaid' ? 'border-warning/40 text-warning' : 'border-hairline-strong text-paper-faint';
            return (
            <li key={invoice.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hairline/60 py-2 first:border-t-0">
              <Badge variant="outline" className={`flex-none font-mono text-[9px] uppercase tracking-wider ${tone}`}>
                {invoice.status === 'paid' ? 'Lunas' : invoice.status === 'unpaid' ? 'Belum bayar' : 'Batal'}
              </Badge>
              <AppTooltip label={invoice.number} side="top">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-paper">{invoice.number}</span>
              </AppTooltip>
              <span className="flex-none font-mono text-[11px] tabular-nums text-paper-dim">{formatIdr(invoice.amountIdr)}</span>
              <span className="min-w-0 flex-none font-mono text-[10px] tabular-nums text-paper-faint">
                {invoice.status === 'unpaid'
                  ? `Tempo ${invoice.dueAt === null ? '-' : formatDate(invoice.dueAt)}`
                  : `Bayar ${invoice.paidAt === null ? '-' : formatDate(invoice.paidAt)}`}
                {invoice.billingNote ? ` · ${invoice.billingNote}` : ''}
              </span>
              {invoice.status === 'voided' && invoice.voidReason ? (
                <span className="w-full font-sans text-[11px] text-error">Batal: {invoice.voidReason}</span>
              ) : null}
              <span className="ml-auto flex flex-none flex-wrap items-center gap-1.5">
                <Button type="button" variant="ghost" size="xs" onClick={() => setPreview(invoice)} disabled={busy}>
                  <span>Pratinjau</span>
                </Button>
                <Button type="button" variant="outline" size="xs" onClick={() => downloadInvoice(invoice)} disabled={busy}>
                  <span>Unduh</span>
                </Button>
                {isPlatform && invoice.status === 'paid' ? (
                  <Button type="button" variant="destructive" size="xs" onClick={() => void voidInvoice(invoice)} disabled={busy}>
                    <span>Batalkan</span>
                  </Button>
                ) : null}
                {isPlatform && invoice.status !== 'paid' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => void reissueInvoice(invoice)}
                    disabled={busy}
                    className="border-brass/60"
                  >
                    <span>Terbitkan ulang</span>
                  </Button>
                ) : null}
              </span>
            </li>
          );
          })}
        </ul>
        )}
        </SectionCard>
      </TabsContent>
      {isPlatform ? (
        <TabsContent keepMounted value="admin">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <SectionCard icon={ShieldCheck} title="Ubah Status Langganan" eyebrow="Platform · manual">
          <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">Ubah status (pembayaran manual di luar sistem)</p>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-org-combo" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Organisasi target
              </Label>
              {hasCustomerOptions ? (
                <SearchCombobox
                  id="manual-org-combo"
                  value={manualOrgId}
                  onValueChange={(next) => setManualOrgId(next ?? '')}
                  disabled={busy}
                  placeholder="Cari organisasi untuk status…"
                  options={customerOptions}
                />
              ) : (
                <Input
                  id="manual-org-combo" value={manualOrgId} onChange={(event) => setManualOrgId(event.target.value)} disabled={busy}
                  placeholder="ID organisasi target…" spellCheck={false}
                  className="font-mono text-xs"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-status" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Status
              </Label>
              <DashboardSelect
                id="manual-status" value={manualStatus} disabled={busy}
                placeholder="Pilih status"
                onValueChange={(next) => { if (next !== null) setManualStatus(next); }}
              >
                <DashboardSelectItem value="active">Aktif (bisa dipakai)</DashboardSelectItem>
                <DashboardSelectItem value="suspended">Ditangguhkan</DashboardSelectItem>
                <DashboardSelectItem value="cancelled">Dibatalkan</DashboardSelectItem>
              </DashboardSelect>
            </div>
          </div>
          <div className="mt-2.5">
            <Button
              type="button" variant="default" size="sm" onClick={() => void manualSetSubscription()} disabled={busy}
            >
              Terapkan status
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={Receipt} title="Catat Faktur" eyebrow="Platform · manual">
          <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">Catat faktur (pembayaran manual terkonfirmasi)</p>
          <p className="m-0 mt-1 font-sans text-[11px] leading-relaxed text-paper-dim">
            Nomor faktur dibuat otomatis dan tidak bisa ditebak. Faktur tercatat langsung berstatus lunas.
          </p>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-org-combo" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Organisasi target
              </Label>
              {hasCustomerOptions ? (
                <SearchCombobox
                  id="invoice-org-combo"
                  value={invoiceOrgId}
                  onValueChange={(next) => setInvoiceOrgId(next ?? '')}
                  disabled={busy}
                  placeholder="Cari organisasi untuk faktur…"
                  options={customerOptions}
                />
              ) : (
                <Input
                  id="invoice-org-combo" value={invoiceOrgId} onChange={(event) => setInvoiceOrgId(event.target.value)} disabled={busy}
                  placeholder="ID organisasi…" spellCheck={false}
                  className="font-mono text-xs"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-amount" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Nominal (Rp)
              </Label>
              <Input
                id="invoice-amount" value={invoiceAmount} onChange={(event) => setInvoiceAmount(event.target.value)} disabled={busy}
                placeholder={String(SINGLE_INVOICE_AMOUNT_IDR)} inputMode="numeric"
                className="font-mono text-xs"
              />
              <p className="m-0 font-sans text-[11px] text-paper-faint">{`Bawaan ${formatIdr(SINGLE_INVOICE_AMOUNT_IDR)}/bulan — dapat diubah manual`}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-paid-at" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Tanggal bayar
              </Label>
              <Input
                id="invoice-paid-at" type="date" value={invoicePaidAt} onChange={(event) => setInvoicePaidAt(event.target.value)} disabled={busy}
                className="font-sans text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-note" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Catatan (opsional)
              </Label>
              <Input
                id="invoice-note" value={invoiceNote} onChange={(event) => setInvoiceNote(event.target.value)} disabled={busy}
                placeholder="Bank, periode, keterangan…"
                className="font-sans text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-method" className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                Metode (opsional)
              </Label>
              <Input
                id="invoice-method" value={invoiceMethod} onChange={(event) => setInvoiceMethod(event.target.value)} disabled={busy}
                placeholder="Transfer bank" spellCheck={false} maxLength={40}
                className="font-sans text-xs"
              />
            </div>
          </div>
          <div className="mt-2.5">
            <Button
              type="button" variant="default" size="sm" onClick={() => void createInvoice()} disabled={busy}
            >
              Catat faktur
            </Button>
          </div>
        </SectionCard>
          </div>
        </TabsContent>
      ) : null}

      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border border-hairline bg-bg-raised">
          <DialogTitle className="font-sans text-sm font-semibold text-paper">
            {preview === null ? 'Pratinjau faktur' : preview.number}
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-paper-dim">
            Stempel LUNAS dan paraf digital dibubuhkan otomatis pada dokumen unduhan.
          </DialogDescription>
          {preview === null ? null : (
            <dl className="m-0 divide-y divide-hairline/60">
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="font-sans text-[11px] text-paper-faint">Nominal</dt>
                <dd className="m-0 font-mono text-xs tabular-nums text-paper">{formatIdr(preview.amountIdr)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="font-sans text-[11px] text-paper-faint">Status</dt>
                <dd className="m-0 text-xs text-paper">{preview.status === 'paid' ? 'Lunas' : preview.status === 'unpaid' ? 'Belum bayar' : 'Batal'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="font-sans text-[11px] text-paper-faint">{preview.status === 'unpaid' ? 'Tempo' : 'Tanggal bayar'}</dt>
                <dd className="m-0 font-mono text-xs tabular-nums text-paper">
                  {preview.status === 'unpaid'
                    ? (preview.dueAt === null ? '-' : formatDate(preview.dueAt))
                    : (preview.paidAt === null ? '-' : formatDate(preview.paidAt))}
                </dd>
              </div>
              {preview.billingNote ? (
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="font-sans text-[11px] text-paper-faint">Catatan</dt>
                  <dd className="m-0 min-w-0 truncate text-right text-xs text-paper">{preview.billingNote}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="font-sans text-[11px] text-paper-faint">Metode</dt>
                <dd className="m-0 min-w-0 truncate text-right text-xs text-paper">{preview.paymentMethod}</dd>
              </div>
            </dl>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if (preview !== null) {
                  window.open(`/api/dashboard/billing/invoice/${preview.id}?organizationId=${encodeURIComponent(preview.organizationId)}`, '_blank', 'noopener');
                }
              }}
              disabled={busy || preview === null}
              className="w-full sm:w-auto"
            >
              Unduh dokumen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
