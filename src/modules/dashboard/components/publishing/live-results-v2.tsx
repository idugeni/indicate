'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe2,
  Link2,
  Loader2,
  Radio,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import { formatBytes } from '@/modules/publishing/compress-image';

interface LiveArticle {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt?: string | null;
  readonly publishedAtMax?: string | null;
  readonly publishedUrls?: readonly string[];
  readonly orgName?: string;
}

interface LiveSite {
  readonly id: string;
  readonly normalizedHostname: string;
}

interface LiveArticleSite {
  readonly articleId: string;
  readonly siteId: string;
  readonly state: string;
  readonly publishedUrl?: string | null;
  readonly publishedAt?: string | null;
}

interface LiveResultsModel {
  readonly articles?: readonly LiveArticle[];
  readonly sites?: readonly LiveSite[];
  readonly articleSites?: readonly LiveArticleSite[];
  readonly total?: number;
  readonly articlesNextCursor?: string | null;
}

interface LiveResultsV2Props {
  readonly data: unknown;
  readonly organizationId?: string;
}

type ResultFilter = 'all' | 'healthy' | 'attention';

interface ResultRow {
  readonly articleId: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt: string | null;
  readonly urls: readonly string[];
  readonly orgName?: string;
}

interface ReadinessState {
  readonly status: 'idle' | 'checking' | 'ready' | 'not-ready' | 'error';
  readonly reason?: string;
}

function collectResults(model: LiveResultsModel): readonly ResultRow[] {
  const articles = model.articles ?? [];
  const sites = new Map((model.sites ?? []).map((site) => [site.id, site.normalizedHostname]));
  const byArticle = new Map<string, ResultRow>();

  for (const article of articles) {
    const direct = Array.isArray(article.publishedUrls) ? article.publishedUrls : [];
    byArticle.set(article.id, {
      articleId: article.id,
      title: article.title,
      slug: article.slug,
      publishedAt: article.publishedAtMax ?? article.publishedAt ?? null,
      urls: [...new Set(direct)],
      ...(article.orgName ? { orgName: article.orgName } : {}),
    });
  }

  for (const row of model.articleSites ?? []) {
    if (row.state !== 'published') continue;
    const article = articles.find((item) => item.id === row.articleId);
    const host = sites.get(row.siteId);
    if (article === undefined || host === undefined) continue;
    const current = byArticle.get(row.articleId);
    const url = row.publishedUrl ?? `https://${host}/${article.slug}`;
    const urls = [...new Set([...(current?.urls ?? []), url])];
    const publishedAt = row.publishedAt && (!current?.publishedAt || row.publishedAt > current.publishedAt)
      ? row.publishedAt
      : current?.publishedAt ?? article.publishedAt ?? null;
    byArticle.set(row.articleId, {
      articleId: row.articleId,
      title: article.title,
      slug: article.slug,
      publishedAt,
      urls,
      ...(article.orgName ? { orgName: article.orgName } : {}),
    });
  }

  return [...byArticle.values()].sort((a, b) => {
    if (a.publishedAt === b.publishedAt) return a.title.localeCompare(b.title, 'id-ID');
    if (a.publishedAt === null) return 1;
    if (b.publishedAt === null) return -1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

export function LiveResultsV2({ data, organizationId }: LiveResultsV2Props) {
  const model = useMemo(() => (data as LiveResultsModel | null) ?? {}, [data]);
  const results = useMemo(() => collectResults(model), [model]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [readiness, setReadiness] = useState<Record<string, ReadinessState>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return results.filter((row) => {
      if (needle !== '' && !`${row.title} ${row.slug} ${row.orgName ?? ''} ${row.urls.join(' ')}`.toLowerCase().includes(needle)) return false;
      const status = readiness[row.articleId]?.status;
      if (filter === 'healthy') return status === 'ready';
      if (filter === 'attention') return status === 'not-ready' || status === 'error';
      return true;
    });
  }, [results, query, filter, readiness]);

  const totalUrls = useMemo(() => results.reduce((sum, row) => sum + row.urls.length, 0), [results]);
  const readyCount = Object.values(readiness).filter((item) => item.status === 'ready').length;
  const attentionCount = Object.values(readiness).filter((item) => item.status === 'not-ready' || item.status === 'error').length;
  const latest = results[0] ?? null;

  const checkArticle = async (row: ResultRow) => {
    const primaryUrl = row.urls[0];
    if (!primaryUrl || !organizationId) return;
    setReadiness((current) => ({ ...current, [row.articleId]: { status: 'checking' } }));
    try {
      const response = await fetch(
        `/api/dashboard/share-readiness?organizationId=${encodeURIComponent(organizationId)}&url=${encodeURIComponent(primaryUrl)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { ready?: boolean; reason?: string };
      setReadiness((current) => ({
        ...current,
        [row.articleId]: payload.ready === true
          ? { status: 'ready' }
          : { status: 'not-ready', reason: payload.reason ?? 'unknown' },
      }));
    } catch {
      setReadiness((current) => ({ ...current, [row.articleId]: { status: 'error' } }));
    }
  };

  return (
    <section aria-label="Live Results V2" className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Live Results Control Tower</p>
          <h1 className="mt-1 font-sans text-xl font-semibold tracking-tight text-paper sm:text-2xl">Live Results</h1>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-paper-dim">Pantau hasil distribusi yang sudah tercatat, buka portal tujuan, dan cek kesiapan preview hanya saat diperlukan.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/[0.06] font-mono text-[10px] text-emerald-400">
            <Radio className="mr-1 h-3 w-3" /> Data tercatat
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Artikel tayang</span><p className="mt-1 font-mono text-xl text-paper">{results.length.toLocaleString('id-ID')}</p></div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Portal aktif</span><p className="mt-1 font-mono text-xl text-paper">{totalUrls.toLocaleString('id-ID')}</p></div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Sudah dicek</span><p className="mt-1 font-mono text-xl text-emerald-400">{readyCount.toLocaleString('id-ID')}</p></div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Perlu perhatian</span><p className="mt-1 font-mono text-xl text-amber-400">{attentionCount.toLocaleString('id-ID')}</p></div>
      </div>

      {latest ? (
        <div className="rounded-lg border border-brass/20 bg-brass/[0.04] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-wider text-brass">Latest result</p>
              <h2 className="mt-1 truncate font-sans text-sm font-semibold text-paper">{latest.title}</h2>
              <p className="mt-1 truncate font-mono text-[10px] text-paper-dim">/{latest.slug} · {formatMoment(latest.publishedAt) ?? 'waktu belum tercatat'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-paper-dim">
              <Globe2 className="h-3.5 w-3.5 text-brass" /> {latest.urls.length} portal
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-hairline bg-bg-raised p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" />
            <Input aria-label="Cari hasil distribusi" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul, slug, organisasi, atau URL…" className="pl-9" />
          </div>
          <DashboardSelect aria-label="Filter hasil" value={filter} onValueChange={(value) => setFilter((value ?? 'all') as ResultFilter)} placeholder="Filter hasil">
            <DashboardSelectItem value="all">Semua hasil</DashboardSelectItem>
            <DashboardSelectItem value="healthy">Preview siap</DashboardSelectItem>
            <DashboardSelectItem value="attention">Perlu perhatian</DashboardSelectItem>
          </DashboardSelect>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline-strong p-12 text-center">
          <Link2 className="mx-auto h-8 w-8 text-paper-faint" />
          <p className="mt-3 font-sans text-sm font-medium text-paper">Belum ada hasil pada scope ini.</p>
          <p className="mt-1 font-sans text-xs text-paper-dim">{results.length === 0 ? 'Hasil akan muncul setelah distribusi tercatat.' : 'Ubah pencarian atau filter.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const state = readiness[row.articleId] ?? { status: 'idle' as const };
            const primaryUrl = row.urls[0];
            return (
              <article key={row.articleId} className="rounded-lg border border-hairline bg-bg-raised p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <h2 className="min-w-0 truncate font-sans text-sm font-semibold text-paper">{row.title}</h2>
                      <Badge variant="outline" className="font-mono text-[9px]">{row.urls.length} portal</Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-paper-dim">/{row.slug} · {formatMoment(row.publishedAt) ?? 'waktu belum tercatat'}</p>
                    {row.orgName ? <p className="mt-0.5 truncate font-sans text-[10px] text-paper-faint">{row.orgName}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryUrl ? (
                      <a href={primaryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded border border-hairline px-2.5 py-1.5 font-mono text-[10px] text-paper-dim hover:border-hairline-strong hover:text-paper">
                        <ExternalLink className="h-3 w-3" /> Buka portal
                      </a>
                    ) : null}
                    {organizationId && primaryUrl ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => void checkArticle(row)} disabled={state.status === 'checking'}>
                        {state.status === 'checking' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : state.status === 'ready' ? <ShieldCheck className="mr-1 h-3 w-3 text-emerald-400" /> : state.status === 'not-ready' ? <XCircle className="mr-1 h-3 w-3 text-amber-400" /> : null}
                        {state.status === 'checking' ? 'Memeriksa…' : state.status === 'ready' ? 'Preview siap' : state.status === 'not-ready' ? 'Belum siap' : state.status === 'error' ? 'Coba lagi' : 'Cek preview'}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {state.status === 'not-ready' ? <p className="mt-2 font-mono text-[10px] text-amber-400">Preview belum siap{state.reason ? `: ${state.reason}` : ''}.</p> : null}
                {state.status === 'ready' ? <p className="mt-2 font-mono text-[10px] text-emerald-400">Preview siap dibagikan.</p> : null}
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {row.urls.slice(0, 6).map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="min-w-0 truncate rounded border border-hairline/60 bg-bg px-2.5 py-1.5 font-mono text-[10px] text-paper-dim hover:border-hairline-strong hover:text-paper">
                      {url}
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[9px] text-paper-faint">
        Scope: {(model.total ?? results.length).toLocaleString('id-ID')} hasil tercatat. Pagination server tetap mengikuti kontrak dashboard saat ini.
      </p>
    </section>
  );
}
