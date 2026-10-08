'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CreditCard, Search, ShieldCheck, Users, UserRoundCog } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import { CustomerManagement } from '@/modules/dashboard/components/customers/customer-management';
import type { DashboardCommand } from '@/modules/dashboard/command';

interface CustomerProjection {
  readonly customer: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly status: string;
    readonly customerMetadata: Readonly<Record<string, unknown>>;
    readonly version: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly subscription: {
    readonly status: string;
    readonly version: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  } | null;
}

type Focus = 'directory' | 'account' | 'actions';

async function getCustomers(
  organizationId: string,
  customerId?: string,
): Promise<readonly CustomerProjection[] | CustomerProjection | null> {
  const query = customerId === undefined ? '' : '&customerId=' + encodeURIComponent(customerId);
  const response = await fetch(
    '/api/dashboard/integrations?organizationId=' +
      encodeURIComponent(organizationId) +
      '&view=customers' +
      query,
  );
  if (!response.ok) throw new Error('Customer request failed');
  return (await response.json()) as readonly CustomerProjection[] | CustomerProjection;
}

export function CustomerOperationsV2({
  organizationId,
  command,
}: {
  readonly organizationId: string;
  readonly command: DashboardCommand;
}) {
  const [focus, setFocus] = useState<Focus>('directory');
  const [customers, setCustomers] = useState<readonly CustomerProjection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerProjection | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await getCustomers(organizationId);
      setCustomers(Array.isArray(result) ? result : result === null ? [] : [result]);
    } catch {
      setError('Gagal memuat customer directory.');
    } finally {
      setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;
    void getCustomers(organizationId, selectedId)
      .then((result) => {
        if (!cancelled && result !== null && !Array.isArray(result))
          setSelected(result as CustomerProjection);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat customer detail.');
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, selectedId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((entry) => {
      const customer = entry.customer;
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      const matchesQuery =
        needle.length === 0 ||
        customer.name.toLowerCase().includes(needle) ||
        customer.slug.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [customers, query, statusFilter]);

  const active = customers.filter((entry) => entry.customer.status === 'active').length;
  const suspended = customers.filter(
    (entry) =>
      entry.subscription?.status === 'suspended' || entry.subscription?.status === 'past_due',
  ).length;
  const archived = customers.filter((entry) => entry.customer.status === 'archived').length;

  return (
    <div className="space-y-5">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Customer Operations
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Customer 360
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-dim">
            Satu workspace untuk memahami akun, subscription state, customer metadata, dan tindakan
            operasional.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Customers', String(customers.length), 'Directory'],
            ['Active', String(active), 'Customer state'],
            ['Attention', String(suspended), 'Subscription state'],
            ['Archived', String(archived), 'Historical'],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-lg border border-hairline bg-bg-raised px-3 py-2.5">
              <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                {label}
              </p>
              <p className="m-0 mt-1 font-mono text-lg font-semibold tabular-nums text-paper">
                {value}
              </p>
              <p className="m-0 mt-0.5 truncate text-[10px] text-paper-faint">{note}</p>
            </div>
          ))}
        </div>
      </header>

      {error !== null ? (
        <p
          role="alert"
          className="m-0 rounded-lg border border-danger/30 bg-danger/[0.04] px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Area Customer Operations"
          className="space-y-1 rounded-xl border border-hairline bg-bg-raised p-2"
        >
          {[
            {
              id: 'directory' as const,
              label: 'Customer Directory',
              description: 'Search + segment accounts',
              icon: Users,
            },
            {
              id: 'account' as const,
              label: 'Customer 360',
              description: 'Account + subscription state',
              icon: UserRoundCog,
            },
            {
              id: 'actions' as const,
              label: 'Account Actions',
              description: 'Create + onboarding',
              icon: Building2,
            },
          ].map(({ id, label, description, icon: Icon }) => {
            const selectedNav = focus === id;
            return (
              <button
                key={String(id)}
                type="button"
                aria-current={selectedNav ? 'page' : undefined}
                onClick={() => setFocus(id as Focus)}
                className={
                  selectedNav
                    ? 'flex w-full items-start gap-3 rounded-lg bg-bg-raised-2 px-3 py-3 text-left text-paper ring-1 ring-brass/30'
                    : 'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
                }
              >
                <Icon
                  className={
                    selectedNav
                      ? 'mt-0.5 h-4 w-4 flex-none text-brass'
                      : 'mt-0.5 h-4 w-4 flex-none text-paper-faint'
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-paper-faint">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {focus === 'directory' ? (
            <SectionCard
              icon={Users}
              title="Customer Directory"
              eyebrow={String(filtered.length) + ' visible accounts'}
            >
              <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-paper-faint"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Cari customer"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama atau slug…"
                    className="pl-8 text-xs"
                  />
                </div>
                <select
                  aria-label="Filter customer status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-hairline bg-bg px-2 text-xs text-paper"
                >
                  <option value="all">Semua status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {busy && customers.length === 0 ? (
                <p className="m-0 py-6 text-center text-xs text-paper-faint">Memuat customer…</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {filtered.map((entry) => (
                    <button
                      key={entry.customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(entry.customer.id);
                        setFocus('account');
                      }}
                      className="rounded-lg border border-hairline bg-bg p-3 text-left hover:bg-bg-raised-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate font-sans text-xs font-semibold text-paper">
                          {entry.customer.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase">
                          {entry.customer.status}
                        </Badge>
                      </div>
                      <p className="m-0 mt-1 truncate font-mono text-[10px] text-paper-faint">
                        {entry.customer.slug}
                      </p>
                      <p className="m-0 mt-2 text-[10px] text-paper-dim">
                        Subscription: {entry.subscription?.status ?? 'none'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}

          {focus === 'account' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <SectionCard icon={UserRoundCog} title="Customer 360" eyebrow="Decision context">
                {selected === null ? (
                  <p className="m-0 py-8 text-center text-xs text-paper-faint">
                    Pilih customer dari directory untuk membuka 360 view.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-hairline bg-bg p-4">
                      <p className="m-0 text-lg font-semibold text-paper">
                        {selected.customer.name}
                      </p>
                      <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">
                        {selected.customer.slug} · {selected.customer.id}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-hairline bg-bg p-3">
                        <p className="m-0 text-[9px] uppercase tracking-wider text-paper-faint">
                          Customer state
                        </p>
                        <p className="m-0 mt-1 text-xs font-semibold text-paper">
                          {selected.customer.status}
                        </p>
                      </div>
                      <div className="rounded-lg border border-hairline bg-bg p-3">
                        <p className="m-0 text-[9px] uppercase tracking-wider text-paper-faint">
                          Subscription
                        </p>
                        <p className="m-0 mt-1 text-xs font-semibold text-paper">
                          {selected.subscription?.status ?? 'none'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-hairline bg-bg p-3">
                        <p className="m-0 text-[9px] uppercase tracking-wider text-paper-faint">
                          Customer version
                        </p>
                        <p className="m-0 mt-1 font-mono text-xs text-paper">
                          {selected.customer.version}
                        </p>
                      </div>
                      <div className="rounded-lg border border-hairline bg-bg p-3">
                        <p className="m-0 text-[9px] uppercase tracking-wider text-paper-faint">
                          Updated
                        </p>
                        <p className="m-0 mt-1 font-mono text-xs text-paper">
                          {formatMoment(selected.customer.updatedAt) ?? 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
              <SectionCard icon={CreditCard} title="Subscription Signal" eyebrow="Current state">
                {selected === null ? (
                  <p className="m-0 py-6 text-center text-xs text-paper-faint">
                    Belum ada customer dipilih.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-signal" aria-hidden="true" />
                      <span className="text-xs text-paper">
                        {selected.subscription?.status ?? 'No subscription'}
                      </span>
                    </div>
                    <p className="m-0 text-[10px] leading-4 text-paper-faint">
                      Subscription state tetap berasal dari domain billing; Customer 360 tidak
                      mengubahnya secara langsung.
                    </p>
                  </div>
                )}
              </SectionCard>
            </div>
          ) : null}

          {focus === 'actions' ? (
            <CustomerManagement command={command} organizationId={organizationId} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
