'use client';

import { useCallback, useEffect, useState } from 'react';

import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

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
  readonly createdAt: string;
}

interface PendingRow extends OrderRow {
  readonly userEmail: string;
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
  const [packageId, setPackageId] = useState('');
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
        const pendingBody = (await api('/api/dashboard/billing?scope=pending')) as readonly PendingRow[];
        setPending(pendingBody);
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

  const createOrder = async () => {
    if (packageId === '') return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('order.create', { packageId, orgId: organizationId });
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
              type="button" onClick={createOrder} disabled={busy || packageId === ''}
              className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
            >
              Buat order
            </button>
          </div>
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
    </div>
  );
}
