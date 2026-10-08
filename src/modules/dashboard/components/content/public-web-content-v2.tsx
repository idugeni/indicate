'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  ImageIcon,
  LayoutTemplate,
  Link2,
  MessageSquare,
  Search,
  Settings2,
  Star,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { ContentManager } from '@/modules/dashboard/components/content/content-manager';

type Row = Record<string, unknown>;
type Bundle = {
  readonly quotes?: readonly Row[];
  readonly faqRows?: readonly Row[];
  readonly showcase?: readonly Row[];
  readonly channels?: readonly Row[];
  readonly templates?: readonly Row[];
};

type Focus = 'posture' | 'components' | 'editor';

const GROUPS = [
  { id: 'quotes', label: 'Testimonials', icon: Star },
  { id: 'faqRows', label: 'FAQ', icon: MessageSquare },
  { id: 'showcase', label: 'Media Showcase', icon: ImageIcon },
  { id: 'channels', label: 'Contact Channels', icon: Link2 },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
] as const;

function activeCount(rows: readonly Row[]) {
  return rows.filter((row) => row.active !== false).length;
}

export function PublicWebContentV2() {
  const [focus, setFocus] = useState<Focus>('posture');
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard/content');
      if (!response.ok) throw new Error('Content request failed');
      setBundle((await response.json()) as Bundle);
    } catch {
      setError('Gagal memuat public web content.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);

  const total = GROUPS.reduce((sum, group) => sum + (bundle?.[group.id]?.length ?? 0), 0);
  const active = GROUPS.reduce((sum, group) => sum + activeCount(bundle?.[group.id] ?? []), 0);
  const inactive = total - active;
  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return GROUPS;
    return GROUPS.filter((group) =>
      (bundle?.[group.id] ?? []).some((row) =>
        Object.values(row).some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(needle),
        ),
      ),
    );
  }, [bundle, query]);

  return (
    <div className="space-y-5">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Public Web Experience
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Public Web Content
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-dim">
            Control center untuk content blocks yang membentuk pengalaman publik, bukan sekadar
            editor CRUD.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Blocks', String(total), 'All content'],
            ['Active', String(active), 'Published state'],
            ['Inactive', String(inactive), 'Needs review'],
            ['Types', String(GROUPS.length), 'Public surfaces'],
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
          aria-label="Area Public Web Content"
          className="space-y-1 rounded-xl border border-hairline bg-bg-raised p-2"
        >
          {[
            {
              id: 'posture' as const,
              label: 'Content Posture',
              description: 'Health + public surface map',
              icon: FileText,
            },
            {
              id: 'components' as const,
              label: 'Public Components',
              description: 'Blocks and active state',
              icon: LayoutTemplate,
            },
            {
              id: 'editor' as const,
              label: 'Editor Actions',
              description: 'Open implementation editor',
              icon: Settings2,
            },
          ].map(({ id, label, description, icon: Icon }) => {
            const activeNav = focus === id;
            return (
              <button
                key={String(id)}
                type="button"
                aria-current={activeNav ? 'page' : undefined}
                onClick={() => setFocus(id as Focus)}
                className={
                  activeNav
                    ? 'flex w-full items-start gap-3 rounded-lg bg-bg-raised-2 px-3 py-3 text-left text-paper ring-1 ring-brass/30'
                    : 'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
                }
              >
                <Icon
                  className={
                    activeNav
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
          {focus === 'posture' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                icon={FileText}
                title="Public Surface Posture"
                eyebrow="Current content state"
              >
                <div className="space-y-2">
                  {GROUPS.map((group) => {
                    const rows = bundle?.[group.id] ?? [];
                    const Icon = group.icon;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setFocus('components')}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-bg p-3 text-left hover:bg-bg-raised-2"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-paper-faint" aria-hidden="true" />
                          <span className="text-xs text-paper">{group.label}</span>
                        </span>
                        <span className="font-mono text-xs text-paper-dim">
                          {rows.length} · {activeCount(rows)} active
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
              <SectionCard icon={Search} title="Content Quality Queue" eyebrow="Actionable review">
                {inactive === 0 ? (
                  <p className="m-0 py-5 text-xs text-signal">
                    Semua content block aktif pada snapshot ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {GROUPS.filter((group) =>
                      (bundle?.[group.id] ?? []).some((row) => row.active === false),
                    ).map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/[0.04] p-3"
                      >
                        <span className="text-xs text-paper">{group.label}</span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] uppercase text-warning"
                        >
                          {(bundle?.[group.id] ?? []).filter((row) => row.active === false).length}{' '}
                          inactive
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          ) : null}

          {focus === 'components' ? (
            <SectionCard
              icon={LayoutTemplate}
              title="Public Components"
              eyebrow={String(filteredGroups.length) + ' surfaces visible'}
            >
              <div className="mb-4">
                <Input
                  aria-label="Cari public content"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari content block, label, atau nilai…"
                  className="text-xs"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {filteredGroups.map((group) => {
                  const rows = bundle?.[group.id] ?? [];
                  return (
                    <div key={group.id} className="rounded-lg border border-hairline bg-bg p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-paper">{group.label}</span>
                        <span className="font-mono text-[10px] text-paper-faint">
                          {rows.length} rows
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {rows.slice(0, 8).map((row, index) => (
                          <span
                            key={String(row.id ?? row.key ?? index)}
                            className={
                              row.active === false
                                ? 'rounded border border-warning/30 px-2 py-1 font-mono text-[9px] text-warning'
                                : 'rounded border border-signal/30 px-2 py-1 font-mono text-[9px] text-signal'
                            }
                          >
                            {row.active === false ? 'inactive' : 'active'}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ) : null}

          {focus === 'editor' ? <ContentManager /> : null}
        </div>
      </div>

      <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
        {busy
          ? 'Refreshing public content snapshot…'
          : 'Public content changes continue through the existing content command boundary.'}
      </p>
    </div>
  );
}
