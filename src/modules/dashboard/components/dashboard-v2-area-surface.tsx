'use client';

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  FileText,
  Globe2,
  Layers3,
  Network,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { View } from '@/modules/dashboard/components/dashboard-types';

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const META: Record<Exclude<View, 'dashboard'>, {
  eyebrow: string;
  title: string;
  purpose: string;
  icon: typeof Activity;
  mode: string;
  action: string;
}> = {
  publishing: { eyebrow: 'SYNDICATION OPERATIONS', title: 'Distribution Control', purpose: 'Control the distribution pipeline from queue state to published outcome.', icon: Send, mode: 'Delivery control', action: 'Refresh delivery' },
  analytics: { eyebrow: 'DECISION SUPPORT', title: 'Network Intelligence', purpose: 'Understand movement across sites, publishers, regions, content and delivery.', icon: BarChart3, mode: 'Intelligence workspace', action: 'Refresh intelligence' },
  articles: { eyebrow: 'EDITORIAL INVENTORY', title: 'Content Library', purpose: 'Find, evaluate and manage the network content inventory without losing workflow context.', icon: FileText, mode: 'Inventory control', action: 'Refresh library' },
  editorial: { eyebrow: 'CONTENT OPERATIONS', title: 'Editorial Workspace', purpose: 'Create and prepare content for a controlled distribution workflow.', icon: FileText, mode: 'Compose workspace', action: 'Refresh workspace' },
  publishers: { eyebrow: 'SOURCE NETWORK', title: 'Publisher Network', purpose: 'Manage publisher identity, affiliation and verification across the network.', icon: UsersRound, mode: 'Source control', action: 'Refresh publishers' },
  media: { eyebrow: 'ASSET OPERATIONS', title: 'Media Library', purpose: 'Treat visual assets as production inventory with clear lifecycle state.', icon: ImageIcon, mode: 'Asset control', action: 'Refresh media' },
  published: { eyebrow: 'PUBLISHED NETWORK', title: 'Live Results', purpose: 'Verify publication outcomes and move from delivery state to shareable URLs.', icon: Radio, mode: 'Outcome verification', action: 'Refresh results' },
  ads: { eyebrow: 'REVENUE OPERATIONS', title: 'Monetization Control', purpose: 'Manage advertising inventory and monetization configuration across sites.', icon: Megaphone, mode: 'Revenue control', action: 'Refresh monetization' },
  configuration: { eyebrow: 'TENANT INFRASTRUCTURE', title: 'Network Infrastructure', purpose: 'Control domains, regions, sites, brand configuration and tenant access.', icon: Globe2, mode: 'Infrastructure control', action: 'Refresh infrastructure' },
  settings: { eyebrow: 'IDENTITY & INTEGRATIONS', title: 'Access & Integrations', purpose: 'Control credentials, API access, integrations and identity settings.', icon: KeyRound, mode: 'Access control', action: 'Refresh access' },
  billing: { eyebrow: 'COMMERCIAL CONTROL', title: 'Billing & Plan', purpose: 'Understand plan state, subscription lifecycle and commercial controls.', icon: CreditCard, mode: 'Commercial control', action: 'Refresh billing' },
  audit: { eyebrow: 'GOVERNANCE', title: 'Audit & Security', purpose: 'Investigate changes through actor, resource, outcome and time.', icon: ShieldCheck, mode: 'Investigation', action: 'Refresh audit' },
  operations: { eyebrow: 'RUNTIME WORKLOADS', title: 'System Operations', purpose: 'Control background workloads, retries, cleanup and runtime exceptions.', icon: Workflow, mode: 'Runtime control', action: 'Refresh operations' },
  moderation: { eyebrow: 'TRUST OPERATIONS', title: 'Trust & Moderation', purpose: 'Review reports and data requests that require deliberate human decisions.', icon: ShieldCheck, mode: 'Trust queue', action: 'Refresh moderation' },
  customers: { eyebrow: 'PLATFORM CONTROL', title: 'Customer Operations', purpose: 'Operate customer organizations, account lifecycle and subscription state.', icon: UserRound, mode: 'Customer control', action: 'Refresh customers' },
  content: { eyebrow: 'BRAND SURFACE', title: 'Public Web Content', purpose: 'Operate public-facing content that shapes the INDICATE brand surface.', icon: Layers3, mode: 'Web content control', action: 'Refresh web content' },
  taxonomy: { eyebrow: 'EDITORIAL STRUCTURE', title: 'Taxonomy Studio', purpose: 'Maintain consistent categories and tags across the editorial system.', icon: Tags, mode: 'Structure control', action: 'Refresh taxonomy' },
  ai: { eyebrow: 'INTELLIGENCE LAYER', title: 'AI Control Center', purpose: 'Control model routing, credentials and AI guardrails explicitly.', icon: Bot, mode: 'AI control', action: 'Refresh AI' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collections(data: unknown): Record<string, Record<string, unknown>[]> {
  if (!isRecord(data)) return {};
  return Object.fromEntries(Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).filter(isRecord)]));
}

function totalRecords(data: unknown): number {
  return Object.values(collections(data)).reduce((sum, rows) => sum + rows.length, 0);
}

function statusTone(data: unknown): Tone {
  const rows = Object.values(collections(data)).flat();
  const text = rows.map((r) => String(r.status ?? r.state ?? r.outcome ?? '')).join(' ').toLowerCase();
  if (/(failed|failure|error|rejected|blocked|critical)/.test(text)) return 'bad';
  if (/(pending|queued|retry|processing|review|draft|warning)/.test(text)) return 'warn';
  if (rows.length > 0) return 'good';
  return 'neutral';
}

function toneClasses(tone: Tone): string {
  return {
    good: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    warn: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    bad: 'border-red-400/20 bg-red-400/10 text-red-300',
    neutral: 'border-white/10 bg-white/[0.03] text-[#8e99b0]',
  }[tone];
}

function Stat({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: string; icon: typeof Activity; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#69748b]">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses(tone)}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 font-mono text-xl font-semibold tabular-nums text-white">{value}</div>
    </div>
  );
}

function Toolbar({ meta, total, onRefresh }: { meta: typeof META[keyof typeof META]; total: number; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-[#080d1a]/80 p-2">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
        <Search className="h-3.5 w-3.5 text-[#66718a]" aria-hidden="true" />
        <span className="font-sans text-xs text-[#707b92]">Search {meta.title.toLowerCase()}…</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#707b92]">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        {total.toLocaleString('id-ID')} records
      </div>
      <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-sans text-xs font-medium text-[#c6cedd] transition-colors hover:bg-white/[0.08]">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Refresh
      </button>
    </div>
  );
}

export function DashboardV2AreaSurface({
  view,
  data,
  onRefresh,
  children,
}: {
  readonly view: Exclude<View, 'dashboard'>;
  readonly data: unknown;
  readonly onRefresh: () => void;
  readonly children: ReactNode;
}) {
  const meta = META[view];
  const Icon = meta.icon;
  const total = totalRecords(data);
  const tone = statusTone(data);
  const toneLabel = tone === 'bad' ? 'Needs attention' : tone === 'warn' ? 'Active work' : tone === 'good' ? 'Operational' : 'Awaiting data';
  const collectionCount = Object.keys(collections(data)).length;

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <header className="relative overflow-visible rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_90%_0%,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_15%_100%,rgba(45,212,191,0.07),transparent_32%),#080d1a] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7d89a2]">{meta.eyebrow}</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56627a]">Production workspace</span>
                </div>
                <h1 className="m-0 mt-2 font-sans text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{meta.title}</h1>
                <p className="m-0 mt-2 max-w-3xl font-sans text-sm leading-6 text-[#8e99b0]">{meta.purpose}</p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] ${toneClasses(tone)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {toneLabel}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Workspace state" value={toneLabel} icon={CheckCircle2} tone={tone} />
            <Stat label="Records in scope" value={total.toLocaleString('id-ID')} icon={Layers3} />
            <Stat label="Data collections" value={collectionCount.toLocaleString('id-ID')} icon={Network} />
            <Stat label="Mode" value={meta.mode} icon={Settings2} />
          </div>
        </header>

        <Toolbar meta={meta} total={total} onRefresh={onRefresh} />

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#0b1020]/80 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] sm:p-5" aria-label={`${meta.title} workflow`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <p className="m-0 font-mono text-[9px] uppercase tracking-[0.18em] text-[#68738a]">Primary workflow</p>
                <h2 className="m-0 mt-1 font-sans text-base font-semibold text-white">{meta.title}</h2>
              </div>
              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#68738a]">{meta.action}</span>
            </div>
            {children}
          </section>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/80 p-4" aria-label="Workspace intelligence">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                <h2 className="m-0 font-sans text-sm font-semibold text-white">Workspace intelligence</h2>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3 text-xs"><span className="text-[#77839a]">Scope</span><span className="font-mono text-[#c4ccda]">Production</span></div>
                <div className="flex items-center justify-between gap-3 text-xs"><span className="text-[#77839a]">State</span><span className="font-mono text-[#c4ccda]">{toneLabel}</span></div>
                <div className="flex items-center justify-between gap-3 text-xs"><span className="text-[#77839a]">Collections</span><span className="font-mono text-[#c4ccda]">{collectionCount}</span></div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b1020]/80 p-4" aria-label="Operational guidance">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                <h2 className="m-0 font-sans text-sm font-semibold text-white">Operator focus</h2>
              </div>
              <p className="m-0 mt-3 font-sans text-xs leading-5 text-[#7e899f]">
                {tone === 'bad' ? 'Periksa exception dan selesaikan item yang gagal sebelum melanjutkan operasi berikutnya.' :
                  tone === 'warn' ? 'Ada pekerjaan aktif. Prioritaskan item tertunda sebelum menambah workload baru.' :
                  tone === 'good' ? 'Surface operasional tersedia. Gunakan filter dan detail workflow untuk tindakan berikutnya.' :
                  'Belum ada data pada scope ini. Gunakan refresh untuk memuat projection terbaru.'}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
