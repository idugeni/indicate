'use client';

import { useCallback, useEffect, useState } from 'react';

import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { TERMS_VERSION } from '@/ui/site/marketing-content';

interface PackageOption {
  readonly id: string;
  readonly name: string;
  readonly plan: string;
  readonly priceIdr: number;
  readonly maxDomains: number | null;
  readonly maxSites: number | null;
  readonly maxMembers: number | null;
  readonly maxApiKeys: number | null;
}

interface OrderRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly plan: string;
  readonly priceIdr: number;
  readonly status: string;
  readonly orgId: string | null;
  readonly proofUrl: string | null;
  readonly termsVersion: string | null;
  readonly createdAt: string;
}

interface ActiveOrderRow {
  readonly id: string;
  readonly packageName: string;
  readonly priceIdr: number;
  readonly orgId: string | null;
  readonly userEmail: string;
  readonly createdAt: string;
}

interface PendingRow extends OrderRow {
  readonly userEmail: string;
}

interface LeadRow {
  readonly id: string;
  readonly nama: string;
  readonly email: string;
  readonly kebutuhan: string;
  readonly createdAt: string;
}

const formatIdr = (value: number) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...init });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as unknown;
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
  const [packages, setPackages] = useState<readonly PackageOption[]>([]);
  const [orders, setOrders] = useState<readonly OrderRow[]>([]);
  const [pending, setPending] = useState<readonly PendingRow[]>([]);
  const [activeList, setActiveList] = useState<readonly ActiveOrderRow[]>([]);
  const [leads, setLeads] = useState<readonly LeadRow[]>([]);
  const [packageId, setPackageId] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [manualOrgId, setManualOrgId] = useState('');
  const [manualPlan, setManualPlan] = useState('pro');
  const [manualStatus, setManualStatus] = useState('active');
  const [manualEndsAt, setManualEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<{ [orderId: string]: File | null }>({});

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [stateBody, orderBody, packageBody] = await Promise.all([
        api(`/api/dashboard/billing?scope=subscription-state&organizationId=${encodeURIComponent(organizationId)}`) as Promise<{ state: string }>,
        api('/api/dashboard/billing?scope=orders') as Promise<readonly OrderRow[]>,
        api('/api/dashboard/billing?scope=packages') as Promise<readonly PackageOption[]>,
      ]);
      setState(stateBody.state);
      setOrders(orderBody);
      // Enterprise custom only via lead review, never direct order.
      const orderable = packageBody.filter((pkg) => pkg.priceIdr > 0);
      setPackages(orderable);
      if (orderable.length > 0 && packageId === '') setPackageId(orderable[0]!.id);
      if (isPlatform) {
        const [pendingBody, activeBody, leadsBody] = await Promise.all([
          api('/api/dashboard/billing?scope=pending') as Promise<readonly PendingRow[]>,
          api('/api/dashboard/billing?scope=active-orders') as Promise<readonly ActiveOrderRow[]>,
          api('/api/dashboard/billing?scope=leads') as Promise<readonly LeadRow[]>,
        ]);
        setPending(pendingBody);
        setActiveList(activeBody);
        setLeads(leadsBody);
      }
    } catch {
      setError('Gagal memuat data langganan.');
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // setState-in-effect: defer reload() to a microtask so setState stays async.
  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const post = useCallback(
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
    let periodEndsAt: string | null = null;
    if (manualEndsAt.trim() !== '') {
      const parsed = new Date(`${manualEndsAt.trim()}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        setError('Tanggal berakhir tidak valid (format YYYY-MM-DD).');
        return;
      }
      periodEndsAt = parsed.toISOString();
    }
    if (!window.confirm(`Terapkan langganan manual? Org ${orgId} → plan ${manualPlan}, status ${manualStatus}${periodEndsAt ? `, berakhir ${periodEndsAt}` : ', tanpa tanggal berakhir (aktif sampai diubah manual)'}.`)) return;
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
        plan: manualPlan,
        status: manualStatus,
        periodStartsAt: new Date().toISOString(),
        periodEndsAt,
        ...(expectedVersion === undefined ? {} : { expectedVersion }),
      });
      setNotice(`Langganan manual tersimpan: ${manualPlan} / ${manualStatus}.`);
      await reload();
    } catch {
      setError('Langganan manual gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const createOrder = async () => {
    if (packageId === '') return;
    if (!termsAccepted) {
      setError('Centang persetujuan Ketentuan Layanan terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('order.create', { packageId, orgId: organizationId, termsAccepted: true, termsVersion: TERMS_VERSION });
      setNotice('Order dibuat. Unggah bukti bayar agar diverifikasi.');
      await reload();
    } catch {
      setError('Order gagal dibuat.');
    } finally {
      setBusy(false);
    }
  };

  const uploadProof = async (order: OrderRow) => {
    const file = proofFile[order.id];
    if (file === null || file === undefined) {
      setError('Pilih berkas bukti bayar dulu (PNG/JPEG/WebP ≤ 5 MB).');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const checksum = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const checksumB64 = btoa(String.fromCharCode(...new Uint8Array(checksum)));
      const auth = (await post('proof.authorize', {
        orderId: order.id, contentType: file.type, sizeBytes: file.size, checksumSha256: checksumB64,
      })) as { url: string; requiredHeaders: Record<string, string> };
      const put = await fetch(auth.url, { method: 'PUT', headers: { ...auth.requiredHeaders, 'Content-Length': String(file.size) }, body: file });
      if (!put.ok) throw new Error(`upload ${put.status}`);
      await post('proof.submit', { orderId: order.id, contentType: file.type, sizeBytes: file.size });
      setNotice('Bukti terkirim. Menunggu verifikasi platform.');
      await reload();
    } catch {
      setError('Unggahan bukti gagal.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (order: PendingRow, approve: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('order.decide', { orderId: order.id, approve, orgId: order.orgId });
      setNotice(approve ? 'Order disetujui — langganan aktif 30 hari.' : 'Order ditolak.');
      await reload();
    } catch {
      setError('Keputusan gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const refund = async (orderId: string) => {
    if (!window.confirm('Tandai order ini sebagai refund? Status berubah permanen menjadi refunded dan tercatat di audit.')) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('order.refund', { orderId });
      setNotice('Order ditandai refund. Penangguhan langganan dilakukan operator terpisah bila diperlukan.');
      await reload();
    } catch {
      setError('Refund gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const viewProof = async (orderId: string) => {
    try {
      const body = (await api(`/api/dashboard/billing?scope=proof-view&orderId=${encodeURIComponent(orderId)}`)) as { url: string };
      window.open(body.url, '_blank', 'noopener');
    } catch {
      setError('Bukti tidak dapat dibuka.');
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-x-10 gap-y-8 md:grid-cols-2">
      <section aria-label="Status langganan" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Langganan</p>
        <p className="m-0 mt-2 font-sans text-lg font-semibold tracking-tight text-paper">
          {state === null ? 'Memuat…' : state === 'platform' ? 'Platform — bebas' : state === 'active' ? 'Aktif' : state === 'grace' || state === 'past_due' ? 'Tenggang baca-saja — segera perpanjang' : state === 'none' ? 'Belum berlangganan' : `Terbatas (${state})`}
        </p>
        {busy ? <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Memuat…</p> : null}
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}

        <div className="mt-5 border-t border-hairline pt-5">
          <p className="m-0 font-sans text-sm font-semibold text-paper">Order baru / upgrade</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={packageId} onChange={(event) => setPackageId(event.target.value)} disabled={busy}
              aria-label="Pilih paket"
              className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper sm:min-w-64"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — {formatIdr(pkg.priceIdr)}/bln ({pkg.maxDomains} domain)
                </option>
              ))}
            </select>
            <button
              type="button" onClick={createOrder} disabled={busy || packageId === '' || !termsAccepted}
              className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
            >
              Buat order
            </button>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 font-sans text-xs leading-relaxed text-paper-dim">
            <input
              type="checkbox" checked={termsAccepted} disabled={busy}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--brass)]"
            />
            <span>
              Saya menyetujui <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-paper">Ketentuan Layanan v{TERMS_VERSION}</a> dan
              memahami ringkasan batas tanggung jawab 12 bulan biaya langganan.
            </span>
          </label>
        </div>
      </section>

      <section aria-label="Order saya" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Order saya</p>
        <ul className="m-0 mt-2 grid list-none gap-0 p-0">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-hairline py-3 last:border-b-0">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {order.packageName} — {formatIdr(order.priceIdr)} · {order.status}
              </p>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">{order.id}</p>
              <p className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">
                {order.termsVersion ? `Persetujuan Terms v${order.termsVersion}` : 'Persetujuan Terms tak tercatat (order pra-clickwrap)'}
              </p>
              {order.status === 'pending_payment' ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <input
                    type="file" accept="image/png,image/jpeg,image/webp"
                    aria-label="Berkas bukti bayar"
                    onChange={(event) => setProofFile((prev) => ({ ...prev, [order.id]: event.target.files?.[0] ?? null }))}
                    className="w-full font-sans text-xs text-paper-dim sm:w-auto sm:max-w-56"
                  />
                  <button
                    type="button" onClick={() => void uploadProof(order)} disabled={busy}
                    className="h-8 border border-hairline-strong px-3 font-sans text-xs text-paper hover:border-paper-faint disabled:opacity-50"
                  >
                    Unggah bukti
                  </button>
                </div>
              ) : null}
            </li>
          ))}
          {orders.length === 0 ? <li className="py-3 font-sans text-sm text-paper-faint">Belum ada order.</li> : null}
        </ul>
      </section>

      {isPlatform ? (
        <section aria-label="Langganan manual" className="rounded-lg border border-brass/60 bg-bg-raised p-5 sm:p-6 md:col-span-2">
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Langganan manual (pembayaran di luar sistem)</p>
          <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
            Opsional tanggal berakhir: kosongkan agar aktif permanen sampai diubah manual (penyapu harian melewatkan periode NULL).
            Untuk mencabut, set status <span className="font-mono">cancelled</span> — plan tetap menempel sebagai arsip pilihan.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <label htmlFor="manual-plan" className="font-sans text-xs font-medium text-paper-dim">
                Plan
              </label>
              <select
                id="manual-plan" value={manualPlan} onChange={(event) => setManualPlan(event.target.value)} disabled={busy}
                className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
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
                <option value="cancelled">Dicabut (user biasa lagi)</option>
                <option value="suspended">Ditangguhkan</option>
                <option value="past_due">Menunggak</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="manual-ends-at" className="font-sans text-xs font-medium text-paper-dim">
                Berakhir (opsional)
              </label>
              <input
                id="manual-ends-at" type="date" value={manualEndsAt} onChange={(event) => setManualEndsAt(event.target.value)} disabled={busy}
                className="h-9 border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button" onClick={() => void manualSetSubscription()} disabled={busy}
              className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
            >
              Terapkan langganan
            </button>
          </div>
        </section>
      ) : null}

      {isPlatform ? (
      <section aria-label="Antrean verifikasi" className="rounded-lg border border-brass/60 bg-bg-raised p-5 sm:p-6 md:col-span-2">
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-brass">Antrean verifikasi platform</p>
          <ul className="m-0 mt-2 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-10">
            {pending.map((order) => (
              <li key={order.id} className="border-b border-hairline py-3">
                <p className="m-0 font-sans text-sm font-medium text-paper">
                  {order.packageName} — {formatIdr(order.priceIdr)} · {order.userEmail}
                </p>
                <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                  org: {order.orgId ?? '(pelanggan baru — tempeli org saat setujui)'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {order.proofUrl ? (
                    <button
                      type="button" onClick={() => void viewProof(order.id)} disabled={busy}
                      className="h-8 border border-hairline-strong px-3 font-sans text-xs text-paper-dim hover:text-paper disabled:opacity-50"
                    >
                      Lihat bukti
                    </button>
                  ) : null}
                  <button
                    type="button" onClick={() => void decide(order, true)} disabled={busy}
                    className="h-8 bg-brass px-3 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
                  >
                    Setujui
                  </button>
                  <button
                    type="button" onClick={() => void decide(order, false)} disabled={busy}
                    className="h-8 border border-error px-3 font-sans text-xs text-error disabled:opacity-50"
                  >
                    Tolak
                  </button>
                </div>
              </li>
            ))}
            {pending.length === 0 ? <li className="py-3 font-sans text-sm text-paper-faint">Tidak ada order menunggu verifikasi.</li> : null}
          </ul>
        </section>
      ) : null}

      {isPlatform ? (
        <section aria-label="Order aktif" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6 md:col-span-2">
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Order aktif — refund</p>
          <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
            Refund menandai order menjadi refunded dan tercatat di audit. Penangguhan langganan adalah keputusan operator
            terpisah, bukan otomatis.
          </p>
          <ul className="m-0 mt-2 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-10">
            {activeList.map((order) => (
              <li key={order.id} className="border-b border-hairline py-3">
                <p className="m-0 font-sans text-sm font-medium text-paper">
                  {order.packageName} — {formatIdr(order.priceIdr)} · {order.userEmail}
                </p>
                <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                  org: {order.orgId ?? '(tanpa org)'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button" onClick={() => void refund(order.id)} disabled={busy}
                    className="h-8 border border-error px-3 font-sans text-xs text-error disabled:opacity-50"
                  >
                    Tandai refund
                  </button>
                </div>
              </li>
            ))}
            {activeList.length === 0 ? <li className="py-3 font-sans text-sm text-paper-faint">Tidak ada order aktif.</li> : null}
          </ul>
        </section>
      ) : null}

      {isPlatform ? (
        <section aria-label="Leads enterprise" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6 md:col-span-2">
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Leads enterprise</p>
          <ul className="m-0 mt-2 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-10">
            {leads.map((lead) => (
              <li key={lead.id} className="border-b border-hairline py-3">
                <p className="m-0 font-sans text-sm font-medium text-paper">
                  {lead.nama} · {lead.email}
                </p>
                <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">{lead.kebutuhan}</p>
                <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">{lead.id}</p>
              </li>
            ))}
            {leads.length === 0 ? <li className="py-3 font-sans text-sm text-paper-faint">Belum ada leads enterprise.</li> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
