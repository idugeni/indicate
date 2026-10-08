'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CircleDollarSign, FileDown, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';

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
  readonly id: string; readonly organizationId: string; readonly number: string;
  readonly amountIdr: number; readonly status: 'paid' | 'voided' | 'unpaid';
  readonly paidAt: string | null; readonly dueAt: string | null; readonly billingNote: string | null;
  readonly paymentMethod: string; readonly version: number; readonly createdAt: string;
};

type Customer = { readonly id: string; readonly name: string; readonly slug: string };

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
  const isPlatform = permissions.includes('platform.super_admin') || permissions.includes('platform.customer.admin');
  const [state, setState] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<readonly Invoice[]>([]);
  const [customers, setCustomers] = useState<readonly Customer[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [status, setStatus] = useState('active');
  const [amount, setAmount] = useState(String(SINGLE_INVOICE_AMOUNT_IDR));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const [s, i] = await Promise.all([
        getJson(`/api/dashboard/billing?scope=subscription-state&organizationId=${encodeURIComponent(organizationId)}`) as Promise<{state: string}>,
        getJson(`/api/dashboard/billing?scope=invoices&organizationId=${encodeURIComponent(organizationId)}`) as Promise<readonly Invoice[]>,
      ]);
      setState(s.state); setInvoices(i);
    } catch { setError('Gagal memuat data monetisasi.'); }
    finally { setBusy(false); }
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    void getJson(
      `/api/dashboard/billing?scope=subscription-state&organizationId=${encodeURIComponent(organizationId)}`,
    )
      .then((s) => getJson(
        `/api/dashboard/billing?scope=invoices&organizationId=${encodeURIComponent(organizationId)}`,
      ).then((i) => ({ s, i })))
      .then(({ s, i }) => {
        if (cancelled) return;
        setState((s as { state: string }).state);
        setInvoices(i as readonly Invoice[]);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat data monetisasi.');
      });
    return () => { cancelled = true; };
  }, [organizationId]);

  useEffect(() => {
    if (!isPlatform) return;
    void getJson(`/api/dashboard/integrations?organizationId=${encodeURIComponent(organizationId)}&view=customers`)
      .then((body) => {
        if (!Array.isArray(body)) return;
        setCustomers(body.flatMap((row): Customer[] => {
          if (typeof row !== 'object' || row === null) return [];
          const c = (row as {customer?: unknown}).customer;
          if (typeof c !== 'object' || c === null) return [];
          const x = c as Record<string, unknown>;
          return typeof x.id === 'string' && typeof x.name === 'string'
            ? [{ id: x.id, name: x.name, slug: typeof x.slug === 'string' ? x.slug : '' }] : [];
        }));
      }).catch(() => setCustomers([]));
  }, [isPlatform, organizationId]);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.slug ? `${c.name} · ${c.slug}` : c.name })),
    [customers],
  );

  const command = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const r = await fetch('/api/dashboard/billing', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action, payload }),
    });
    if (!r.ok) throw new Error('command failed');
    return r.json() as Promise<unknown>;
  }, []);

  const runAction = async (action: string, payload: Record<string, unknown>, success: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { await command(action, payload); setNotice(success); await load(); }
    catch { setError('Operasi monetisasi gagal. Coba lagi.'); }
    finally { setBusy(false); }
  };

  const paid = invoices.filter((i) => i.status === 'paid');
  const open = invoices.filter((i) => i.status === 'unpaid');
  const voided = invoices.filter((i) => i.status === 'voided');
  const paidValue = paid.reduce((n, i) => n + i.amountIdr, 0);
  const openValue = open.reduce((n, i) => n + i.amountIdr, 0);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Monetization Control Center</p>
          <h1 className="m-0 mt-1 font-sans text-2xl font-semibold tracking-tight text-paper">Revenue & Billing</h1>
          <p className="m-0 mt-1 max-w-2xl text-xs leading-relaxed text-paper-dim">Satu workspace untuk status akses, nilai tagihan, dan tindakan billing yang terotorisasi.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </Button>
      </header>

      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}

      <section aria-label="Ringkasan monetisasi" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Status akses', state === 'platform' ? 'Platform' : state === null ? 'Memuat…' : state],
          ['Lunas', money(paidValue)],
          ['Terbuka', money(openValue)],
          ['Faktur', String(invoices.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-hairline bg-bg-raised p-4">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">{label}</p>
            <p className="m-0 mt-2 truncate font-mono text-lg font-semibold tabular-nums text-paper">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard icon={CircleDollarSign} title="Invoice Ledger" eyebrow={`${invoices.length} catatan · ${voided.length} dibatalkan`}>
          {invoices.length === 0 ? (
            <EmptyState compact title="Belum ada faktur untuk organisasi ini." />
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <article key={invoice.id} className="rounded-lg border border-hairline bg-bg p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate font-mono text-xs font-semibold text-paper">{invoice.number}</p>
                      <p className="m-0 mt-1 text-[11px] text-paper-dim">{formatDate(invoice.createdAt)} · {customerName(invoice.organizationId)}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{invoice.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums text-paper">{money(invoice.amountIdr)}</span>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => window.open(`/api/dashboard/billing/invoice/${invoice.id}?organizationId=${encodeURIComponent(invoice.organizationId)}`, '_blank', 'noopener')}>
                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" /> Unduh
                      </Button>
                      {isPlatform && invoice.status === 'paid' ? (
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => {
                          const reason = window.prompt(`Alasan batal ${invoice.number}:`);
                          if (reason?.trim()) void runAction('invoice.void', { invoiceId: invoice.id, expectedVersion: invoice.version, reason: reason.trim() }, 'Faktur dibatalkan.');
                        }}>Batalkan</Button>
                      ) : null}
                      {isPlatform && invoice.status === 'voided' ? (
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => {
                          const reason = window.prompt(`Alasan terbitkan ulang ${invoice.number}:`);
                          if (reason?.trim()) void runAction('invoice.reissue', { invoiceId: invoice.id, expectedVersion: invoice.version, reason: reason.trim() }, 'Faktur pengganti diterbitkan.');
                        }}>Terbitkan ulang</Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard icon={BadgeCheck} title="Access State" eyebrow="Status organisasi">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="font-sans text-sm font-semibold text-paper">{state ?? 'Memuat…'}</span>
            </div>
            {state && !['active', 'platform'].includes(state) ? (
              <p className="m-0 mt-3 flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                <TriangleAlert className="h-3.5 w-3.5 flex-none" aria-hidden="true" /> Akses organisasi membutuhkan perhatian.
              </p>
            ) : null}
          </SectionCard>

          {isPlatform ? (
            <SectionCard icon={ShieldCheck} title="Platform Actions" eyebrow="Tindakan terotorisasi">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monetization-org">Organisasi</Label>
                  <SearchCombobox id="monetization-org" value={selectedOrg} onValueChange={(v) => setSelectedOrg(v ?? '')} options={customerOptions} placeholder="Pilih organisasi…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monetization-status">Status</Label>
                  <select id="monetization-status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy} className="h-9 w-full rounded-md border border-hairline bg-bg px-2 text-xs text-paper">
                    <option value="active">active</option><option value="suspended">suspended</option><option value="cancelled">cancelled</option>
                  </select>
                </div>
                <Button type="button" size="sm" disabled={busy || !selectedOrg} onClick={() => {
                  if (window.confirm(`Ubah akses ${customerName(selectedOrg)} → ${status}?`)) {
                    void runAction('subscription.update', { organizationId: selectedOrg, status }, 'Status langganan diperbarui.');
                  }
                }}>Terapkan status</Button>
                <div className="border-t border-hairline pt-4">
                  <Label htmlFor="monetization-amount">Nominal faktur</Label>
                  <Input id="monetization-amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} inputMode="numeric" className="mt-1.5 font-mono text-xs" />
                  <p className="m-0 mt-1 text-[10px] text-paper-faint">Bawaan {money(SINGLE_INVOICE_AMOUNT_IDR)} per periode.</p>
                  <Button type="button" size="sm" className="mt-3" disabled={busy || !selectedOrg} onClick={() => {
                    const n = Number(amount);
                    if (!Number.isInteger(n) || n < 1) { setError('Nominal faktur tidak valid.'); return; }
                    if (window.confirm(`Catat faktur ${customerName(selectedOrg)} · ${money(n)}?`)) {
                      void runAction('invoice.create', { organizationId: selectedOrg, amountIdr: n, paidAt: new Date().toISOString(), billingNote: null, paymentMethod: null }, 'Faktur tercatat.');
                    }
                  }}>Catat faktur</Button>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
