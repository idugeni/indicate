'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleHelp, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

function labelForStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'active': return 'Aktif berlangganan';
    case 'trialing': return 'Masa uji coba';
    case 'past_due': return 'Tagihan tertunda';
    case 'canceled':
    case 'cancelled': return 'Langganan berakhir';
    case 'inactive':
    case 'unpaid': return 'Tidak aktif';
    default: return 'Status belum tersedia';
  }
}

/**
 * Keep the organization-facing Membership page intentionally minimal:
 * it communicates the billing service's subscription status rather than
 * exposing member rosters, roles, invitations, or administration controls.
 */
export function MembershipWorkspaceV2({ organizationId }: {
  readonly data?: unknown;
  readonly command?: unknown;
  readonly organizationId: string;
  readonly permissions?: ReadonlySet<string>;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadStatus = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(
          `/api/dashboard/billing?scope=subscription-state&organizationId=${encodeURIComponent(organizationId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error('subscription status unavailable');
        const body = await response.json() as { readonly state?: unknown };
        if (typeof body.state !== 'string' || body.state.trim() === '') {
          throw new Error('subscription status missing');
        }
        setStatus(body.state);
      } catch {
        if (!controller.signal.aborted) {
          setStatus(null);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadStatus();
    return () => controller.abort();
  }, [organizationId]);

  const active = status?.toLowerCase() === 'active';
  const label = status === null ? (loading ? 'Memuat status…' : 'Status tidak tersedia') : labelForStatus(status);

  return (
    <div className="space-y-6">
      <header className="border-b border-hairline pb-5">
        <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
          Organization Subscription
        </p>
        <h1 className="m-0 mt-1 font-sans text-2xl font-semibold tracking-tight text-paper">
          Membership
        </h1>
        <p className="m-0 mt-1 max-w-2xl text-xs leading-relaxed text-paper-dim">
          Informasi singkat status langganan organisasi.
        </p>
      </header>

      <section aria-label="Status langganan organisasi" aria-live="polite" className="rounded-xl border border-hairline bg-bg-raised p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {loading
            ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-paper-dim" aria-hidden="true" />
            : active
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
              : <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-paper-dim" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-medium text-paper">Status langganan</p>
            <div className="mt-2">
              <Badge variant={active ? 'default' : 'secondary'}>{label}</Badge>
            </div>
            <p className="m-0 mt-2 text-xs leading-relaxed text-paper-dim">
              {loading
                ? 'Status langganan sedang diperiksa.'
                : active
                  ? 'Organisasi Anda saat ini berlangganan aktif.'
                  : failed
                    ? 'Status langganan tidak dapat dimuat. Silakan coba muat ulang halaman.'
                    : 'Periksa halaman Invoice untuk detail tagihan atau tindak lanjut yang diperlukan.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
