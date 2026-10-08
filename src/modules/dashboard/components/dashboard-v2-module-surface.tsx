'use client';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileBarChart,
  FileText,
  Globe2,
  Image as ImageIcon,
  Layers3,
  Link2,
  ListChecks,
  Megaphone,
  Network,
  PackageCheck,
  PencilLine,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Tags,
  UserRound,
  UsersRound,
  WalletCards,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { View } from '@/modules/dashboard/components/dashboard-types';

type RecordValue = Record<string, unknown>;

interface DashboardV2ModuleSurfaceProps {
  readonly view: Exclude<View, 'dashboard'>;
  readonly data: unknown;
  readonly onRefresh: () => void;
}

const ICONS: Record<Exclude<View, 'dashboard'>, typeof Activity> = {
  configuration: Globe2,
  publishers: UsersRound,
  editorial: PencilLine,
  taxonomy: Tags,
  articles: FileText,
  media: ImageIcon,
  publishing: Send,
  published: Radio,
  ads: Megaphone,
  analytics: BarChart3,
  audit: ShieldCheck,
  operations: Workflow,
  settings: Settings2,
  customers: UserRound,
  content: Layers3,
  billing: WalletCards,
  moderation: ShieldCheck,
  ai: Bot,
};

const META: Record<Exclude<View, 'dashboard'>, { eyebrow: string; title: string; purpose: string }> = {
  configuration: { eyebrow: 'NETWORK CONTROL', title: 'Network Infrastructure', purpose: 'Kelola estate domain, site, wilayah, dan konfigurasi tenant dari satu control surface.' },
  publishers: { eyebrow: 'SOURCE NETWORK', title: 'Publisher Network', purpose: 'Pantau sumber berita, afiliasi, dan kualitas hubungan penerbit dengan jaringan.' },
  editorial: { eyebrow: 'CONTENT OPERATIONS', title: 'Editorial Workspace', purpose: 'Ruang kerja untuk menyiapkan konten sebelum masuk ke jalur distribusi.' },
  taxonomy: { eyebrow: 'EDITORIAL STRUCTURE', title: 'Taxonomy Studio', purpose: 'Bangun struktur kategori dan tag yang konsisten tanpa kehilangan konteks konten.' },
  articles: { eyebrow: 'EDITORIAL INVENTORY', title: 'Content Library', purpose: 'Temukan, evaluasi, dan kelola artikel dengan workflow yang jelas.' },
  media: { eyebrow: 'ASSET OPERATIONS', title: 'Media Library', purpose: 'Kelola aset visual sebagai inventory kerja, bukan sekadar daftar file.' },
  publishing: { eyebrow: 'SYNDICATION OPERATIONS', title: 'Distribution Control', purpose: 'Pantau delivery, retry, failure, dan hasil distribusi secara operasional.' },
  published: { eyebrow: 'PUBLISHED NETWORK', title: 'Live Results', purpose: 'Verifikasi hasil publikasi dan telusuri URL yang benar-benar telah tayang.' },
  ads: { eyebrow: 'REVENUE OPERATIONS', title: 'Monetization Control', purpose: 'Kelola inventory iklan dan status monetisasi dengan data yang tersedia.' },
  analytics: { eyebrow: 'DECISION SUPPORT', title: 'Network Intelligence', purpose: 'Jawab apa yang berubah, di mana terjadi, dan apa yang perlu ditindaklanjuti.' },
  audit: { eyebrow: 'GOVERNANCE', title: 'Audit & Security', purpose: 'Investigasi perubahan berdasarkan aktor, resource, waktu, dan event.' },
  operations: { eyebrow: 'RUNTIME WORKLOADS', title: 'System Operations', purpose: 'Tangani antrean, retry, cleanup, dan exception runtime.' },
  settings: { eyebrow: 'IDENTITY & INTEGRATIONS', title: 'Access & Integrations', purpose: 'Kelola akses, kredensial, integrasi, dan koneksi platform.' },
  customers: { eyebrow: 'PLATFORM CONTROL', title: 'Customer Operations', purpose: 'Pantau organisasi pelanggan dan lifecycle account.' },
  content: { eyebrow: 'BRAND SURFACE', title: 'Public Web Content', purpose: 'Kelola konten publik yang membentuk permukaan brand INDICATE.' },
  billing: { eyebrow: 'COMMERCIAL CONTROL', title: 'Billing & Plan', purpose: 'Pahami status paket, subscription state, dan kontrol komersial.' },
  moderation: { eyebrow: 'TRUST OPERATIONS', title: 'Trust & Moderation', purpose: 'Tangani laporan dan permintaan yang membutuhkan keputusan manusia.' },
  ai: { eyebrow: 'INTELLIGENCE LAYER', title: 'AI Control Center', purpose: 'Kelola routing, kredensial, dan guardrails AI secara eksplisit.' },
};

function records(data: unknown): Record<string, RecordValue[]> {
  if (Array.isArray(data)) return { records: data.filter(isRecord) };
  if (!isRecord(data)) return {};
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.filter(isRecord)]),
  );
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstCollection(data: unknown): RecordValue[] {
  const all = records(data);
  return Object.values(all)[0] ?? [];
}

function count(data: unknown): number {
  return Object.values(records(data)).reduce((sum, items) => sum + items.length, 0);
}

function value(item: RecordValue, keys: string[]): string {
  for (const key of keys) {
    const candidate = item[key];
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate;
    if (typeof candidate === 'number') return String(candidate);
  }
  return '—';
}

function status(item: RecordValue): string {
  return value(item, ['status', 'state', 'deliveryStatus', 'outcome', 'action']);
}

function tone(text: string): 'good' | 'warn' | 'bad' | 'neutral' {
  const lower = text.toLowerCase();
  if (/(fail|error|blocked|rejected|critical|expired)/.test(lower)) return 'bad';
  if (/(retry|pending|queued|warning|review|processing|draft)/.test(lower)) return 'warn';
  if (/(published|success|active|complete|verified|ready|live)/.test(lower)) return 'good';
  return 'neutral';
}

function Status({ children }: { readonly children: string }) {
  const kind = tone(children);
  const classes = {
    good: 'border-signal/30 bg-signal/10 text-signal',
    warn: 'border-brass/30 bg-brass/10 text-brass',
    bad: 'border-danger/30 bg-danger/10 text-danger',
    neutral: 'border-hairline bg-bg text-paper-faint',
  }[kind];
  return <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${classes}`}>{children}</span>;
}

function Metric({ label, value: metric, icon: Icon }: { readonly label: string; readonly value: string; readonly icon: typeof Activity }) {
  return (
    <div className="rounded-xl border border-hairline bg-bg-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-faint">{label}</span>
        <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tabular-nums text-paper">{metric}</div>
    </div>
  );
}

function Surface({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-bg-raised/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold text-paper">{title}</h2>
          {description ? <p className="m-0 mt-1 max-w-2xl font-sans text-xs leading-5 text-paper-faint">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ label, onRefresh }: { readonly label: string; readonly onRefresh: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-hairline-strong bg-bg/60 px-6 text-center">
      <Activity className="h-5 w-5 text-paper-faint" aria-hidden="true" />
      <p className="m-0 mt-3 font-sans text-sm text-paper">{label}</p>
      <button type="button" onClick={onRefresh} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-hairline-strong px-3 py-2 font-sans text-xs text-paper-dim transition-colors hover:border-brass/50 hover:text-paper">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Muat ulang
      </button>
    </div>
  );
}

function Rows({ items, empty, onRefresh }: { readonly items: RecordValue[]; readonly empty: string; readonly onRefresh: () => void }) {
  if (items.length === 0) return <Empty label={empty} onRefresh={onRefresh} />;
  return (
    <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
      {items.slice(0, 8).map((item, index) => {
        const name = value(item, ['name', 'title', 'hostname', 'normalizedHostname', 'email', 'id']);
        const sub = value(item, ['description', 'domain', 'slug', 'type', 'createdAt']);
        const state = status(item);
        return (
          <div key={String(item.id ?? index)} className="flex items-center gap-4 bg-bg/70 px-4 py-3 transition-colors hover:bg-bg-raised-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-bg-raised-2">
              <ChevronRight className="h-3.5 w-3.5 text-paper-faint" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-sans text-sm font-medium text-paper">{name}</div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-paper-faint">{sub}</div>
            </div>
            <Status>{state}</Status>
          </div>
        );
      })}
    </div>
  );
}

function Toolbar({ placeholder, count: total }: { readonly placeholder: string; readonly count: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-hairline bg-bg px-3 py-2">
        <Search className="h-4 w-4 text-paper-faint" aria-hidden="true" />
        <span className="font-sans text-xs text-paper-faint">{placeholder}</span>
      </div>
      <span className="rounded-lg border border-hairline bg-bg px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-paper-faint">{total} records</span>
    </div>
  );
}

function CollectionWorkspace({ data, onRefresh, mode }: { readonly data: unknown; readonly onRefresh: () => void; readonly mode: 'inventory' | 'control' | 'governance' }) {
  const all = records(data);
  const items = firstCollection(data);
  const entries = Object.entries(all);
  return (
    <div className="space-y-5">
      <Toolbar placeholder={mode === 'governance' ? 'Cari event, actor, resource…' : 'Cari dan filter data…'} count={count(data)} />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Records" value={String(items.length)} icon={ListChecks} />
        <Metric label="Collections" value={String(entries.length)} icon={Layers3} />
        <Metric label="Visible window" value={items.length > 8 ? '8+' : String(items.length)} icon={Activity} />
      </div>
      <Surface title={mode === 'control' ? 'Control surface' : mode === 'governance' ? 'Investigation stream' : 'Primary inventory'}>
        <Rows items={items} empty="Belum ada data pada surface ini." onRefresh={onRefresh} />
      </Surface>
    </div>
  );
}

function PublishingSurface({ data, onRefresh }: { readonly data: unknown; readonly onRefresh: () => void }) {
  const all = records(data);
  const items = Object.values(all).flat();
  const failed = items.filter((item) => tone(status(item)) === 'bad').length;
  const pending = items.filter((item) => tone(status(item)) === 'warn').length;
  const healthy = items.length - failed;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Delivery stream" value={String(items.length)} icon={Send} />
        <Metric label="Needs attention" value={String(failed + pending)} icon={AlertTriangle} />
        <Metric label="Healthy outcomes" value={String(healthy)} icon={PackageCheck} />
      </div>
      <Surface title="Delivery control" description="Prioritaskan exception dan status distribusi sebelum membuka detail record.">
        <Rows items={items} empty="Tidak ada delivery pada window saat ini." onRefresh={onRefresh} />
      </Surface>
    </div>
  );
}

function AnalyticsSurface({ data, onRefresh }: { readonly data: unknown; readonly onRefresh: () => void }) {
  const all = records(data);
  const articles = all.articlesByRegion ?? all.articles ?? [];
  const regions = all.articlesByRegion ?? [];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Analysis records" value={String(count(data))} icon={BarChart3} />
        <Metric label="Articles" value={String(articles.length)} icon={FileBarChart} />
        <Metric label="Dimensions" value={String(Object.keys(all).length)} icon={Network} />
        <Metric label="Freshness" value="Live projection" icon={Clock3} />
      </div>
      <Surface title="Network intelligence" description="Mulai dari perubahan yang terlihat, lalu drill down ke dimensi yang menjelaskannya.">
        {regions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regions.slice(0, 12).map((item, index) => (
              <div key={String(item.id ?? index)} className="rounded-xl border border-hairline bg-bg p-4">
                <div className="font-sans text-sm font-medium text-paper">{value(item, ['region', 'name', 'label', 'title'])}</div>
                <div className="mt-2 font-mono text-xl tabular-nums text-paper">{value(item, ['count', 'total', 'views', 'value'])}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-paper-faint">observed</div>
              </div>
            ))}
          </div>
        ) : (
          <Rows items={articles} empty="Belum ada analytical projection untuk ditampilkan." onRefresh={onRefresh} />
        )}
      </Surface>
    </div>
  );
}

function ModuleSurface({ view, data, onRefresh }: DashboardV2ModuleSurfaceProps) {
  if (view === 'publishing') return <PublishingSurface data={data} onRefresh={onRefresh} />;
  if (view === 'analytics') return <AnalyticsSurface data={data} onRefresh={onRefresh} />;
  if (view === 'operations') return <CollectionWorkspace data={data} onRefresh={onRefresh} mode="control" />;
  if (view === 'audit' || view === 'moderation') return <CollectionWorkspace data={data} onRefresh={onRefresh} mode="governance" />;
  return <CollectionWorkspace data={data} onRefresh={onRefresh} mode="inventory" />;
}

export function DashboardV2ModuleSurface({ view, data, onRefresh }: DashboardV2ModuleSurfaceProps) {
  const meta = META[view];
  const Icon = ICONS[view];
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-bg-raised px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brass/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 font-mono text-[9px] font-medium tracking-[0.18em] text-brass">{meta.eyebrow}</div>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hairline-strong bg-bg">
                <Icon className="h-5 w-5 text-brass" aria-hidden="true" />
              </div>
              <div>
                <h1 className="m-0 font-sans text-2xl font-semibold tracking-tight text-paper sm:text-3xl">{meta.title}</h1>
                <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-faint">{meta.purpose}</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-signal/20 bg-signal/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-signal" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-signal">Production data</span>
          </div>
        </div>
      </div>
      <ModuleSurface view={view} data={data} onRefresh={onRefresh} />
    </div>
  );
}
