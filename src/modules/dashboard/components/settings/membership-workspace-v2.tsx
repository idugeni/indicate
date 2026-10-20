'use client';

import { CheckCircle2, CircleHelp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface MembershipStatusModel {
  readonly status?: unknown;
  readonly subscriptionStatus?: unknown;
  readonly subscription?: { readonly status?: unknown } | null;
}

/**
 * Keep the organization-facing Membership page intentionally minimal:
 * it communicates subscription status rather than exposing member rosters,
 * roles, invitations, or administration controls.
 */
export function MembershipWorkspaceV2({ data }: {
  readonly data: unknown;
  readonly command?: unknown;
  readonly organizationId?: string;
  readonly permissions?: ReadonlySet<string>;
}) {
  const model = (typeof data === 'object' && data !== null ? data : {}) as MembershipStatusModel;
  const rawStatus = model.subscriptionStatus ?? model.subscription?.status ?? model.status;
  const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
  const active = status === 'active';
  const label = active ? 'Aktif berlangganan'
    : status === 'trialing' ? 'Masa uji coba'
    : status === 'past_due' ? 'Tagihan tertunda'
    : status === 'canceled' || status === 'cancelled' ? 'Langganan berakhir'
    : status === 'inactive' || status === 'unpaid' ? 'Tidak aktif'
    : 'Status belum tersedia';

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

      <section aria-label="Status langganan organisasi" className="rounded-xl border border-hairline bg-bg-raised p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {active
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
            : <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-paper-dim" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-medium text-paper">Status langganan</p>
            <div className="mt-2">
              <Badge variant={active ? 'default' : 'secondary'}>{label}</Badge>
            </div>
            <p className="m-0 mt-2 text-xs leading-relaxed text-paper-dim">
              {active
                ? 'Organisasi Anda saat ini berlangganan aktif.'
                : status === ''
                  ? 'Status langganan belum dapat dipastikan dari data yang tersedia.'
                  : 'Periksa halaman Invoice untuk detail tagihan atau tindak lanjut yang diperlukan.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
