'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  Link2,
  Radio,
  Search,
  Shuffle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';

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
  readonly active?: boolean;
  readonly publishedUrl?: string | null;
  readonly publishedAt?: string | null;
}

interface BridgePublishedEntry {
  readonly articleId: string;
  readonly urls: readonly string[];
  readonly publishedAtMax: string | null;
}

interface LiveResultsModel {
  readonly articles?: readonly LiveArticle[];
  readonly sites?: readonly LiveSite[];
  readonly articleSites?: readonly LiveArticleSite[];
  readonly bridgePublished?: readonly BridgePublishedEntry[];
  readonly total?: number;
  readonly articlesNextCursor?: string | null | undefined;
}

interface LoadMoreArticlesResult {
  readonly loaded: number;
  readonly total: number;
  readonly nextCursor: string | null;
  readonly articles: readonly unknown[];
  readonly articleSites: readonly unknown[];
  readonly bridgePublished: readonly unknown[];
}

interface LiveResultsV2Props {
  readonly data: unknown;
  readonly articlesNextCursor?: string | null | undefined;
  readonly articlesTotal?: number | undefined;
  readonly onLoadMoreArticles?:
    | ((cursor?: string | null) => Promise<LoadMoreArticlesResult | null>)
    | undefined;
  readonly crossOrg?: boolean | undefined;
}

interface ResultRow {
  readonly articleId: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt: string | null;
  readonly urls: readonly string[];
  readonly orgName?: string;
}

type CopyOrder = 'ordered' | 'random';

function collectResults(model: LiveResultsModel): readonly ResultRow[] {
  const articles = model.articles ?? [];
  const articlesById = new Map(articles.map((article) => [article.id, article]));
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
    if (row.state !== 'published' || row.active === false) continue;
    const article = articlesById.get(row.articleId);
    const host = sites.get(row.siteId);
    if (article === undefined || host === undefined) continue;
    const current = byArticle.get(row.articleId);
    const url = row.publishedUrl ?? `https://${host}/${article.slug}`;
    const urls = [...new Set([...(current?.urls ?? []), url])];
    const publishedAt =
      row.publishedAt && (!current?.publishedAt || row.publishedAt > current.publishedAt)
        ? row.publishedAt
        : (current?.publishedAt ?? article.publishedAt ?? null);
    byArticle.set(row.articleId, {
      articleId: row.articleId,
      title: article.title,
      slug: article.slug,
      publishedAt,
      urls,
      ...(article.orgName ? { orgName: article.orgName } : {}),
    });
  }

  for (const bridge of model.bridgePublished ?? []) {
    if (bridge.urls.length === 0) continue;
    const article = articlesById.get(bridge.articleId);
    const current = byArticle.get(bridge.articleId);
    if (article === undefined && current === undefined) continue;
    const urls = [...new Set([...(current?.urls ?? []), ...bridge.urls])];
    const publishedAt =
      bridge.publishedAtMax &&
      (!current?.publishedAt || bridge.publishedAtMax > current.publishedAt)
        ? bridge.publishedAtMax
        : (current?.publishedAt ?? article?.publishedAt ?? null);
    const orgName = current?.orgName ?? article?.orgName;
    byArticle.set(bridge.articleId, {
      articleId: bridge.articleId,
      title: current?.title ?? article!.title,
      slug: current?.slug ?? article!.slug,
      publishedAt,
      urls,
      ...(orgName ? { orgName } : {}),
    });
  }

  return [...byArticle.values()].sort((a, b) => {
    if (a.publishedAt === b.publishedAt) return a.title.localeCompare(b.title, 'id-ID');
    if (a.publishedAt === null) return 1;
    if (b.publishedAt === null) return -1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

function collectUrls(rows: readonly ResultRow[]): readonly string[] {
  return [...new Set(rows.flatMap((row) => row.urls).filter((url) => url.trim() !== ''))];
}

function filterResults(rows: readonly ResultRow[], query: string): readonly ResultRow[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return rows;
  return rows.filter((row) =>
    `${row.title} ${row.slug} ${row.orgName ?? ''} ${row.urls.join(' ')}`
      .toLowerCase()
      .includes(needle),
  );
}

function shuffleUrls(urls: readonly string[]): string[] {
  const shuffled = [...urls];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled;
}

function formatWhatsappLinks(urls: readonly string[]): string {
  return urls.map((url, index) => `${index + 1}. ${url}`).join('\n');
}

export function LiveResultsV2({
  data,
  articlesNextCursor,
  articlesTotal,
  onLoadMoreArticles,
  crossOrg = false,
}: LiveResultsV2Props) {
  const model = useMemo(() => (data as LiveResultsModel | null) ?? {}, [data]);
  const results = useMemo(() => collectResults(model), [model]);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<{
    readonly articleId: string;
    readonly order: CopyOrder;
  } | null>(null);
  const [copyError, setCopyError] = useState<{
    readonly articleId: string;
    readonly message: string;
  } | null>(null);
  const [copyingArticleId, setCopyingArticleId] = useState<string | null>(null);
  const [page, setPage] = useDashboardPage('liveResultsPage');
  const [loadingMore, setLoadingMore] = useState(false);
  const totalResults = model.total ?? articlesTotal ?? results.length;
  const nextCursor = model.articlesNextCursor ?? articlesNextCursor ?? null;

  const filtered = useMemo(() => filterResults(results, query), [results, query]);

  const urls = useMemo(() => collectUrls(filtered), [filtered]);
  const latest = results[0] ?? null;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * 20, safePage * 20);

  const loadMoreResults = async () => {
    if (
      nextCursor === null ||
      onLoadMoreArticles === undefined ||
      loadingMore ||
      copyingArticleId !== null
    )
      return;
    setLoadingMore(true);
    setCopyError(null);
    try {
      const page = await onLoadMoreArticles(nextCursor);
      if (page === null)
        setCopyError({ articleId: '', message: 'Gagal memuat hasil tambahan. Coba lagi.' });
    } catch {
      setCopyError({ articleId: '', message: 'Gagal memuat hasil tambahan. Coba lagi.' });
    } finally {
      setLoadingMore(false);
    }
  };

  const copyArticleLinks = async (row: ResultRow, order: CopyOrder) => {
    if (copyingArticleId !== null) return;
    setCopyingArticleId(row.articleId);
    setCopied(null);
    setCopyError(null);
    try {
      const articleUrls = [...new Set(row.urls.filter((url) => url.trim() !== ''))];
      if (articleUrls.length === 0) throw new Error('Artikel ini belum memiliki URL tayang.');
      const orderedUrls = order === 'random' ? shuffleUrls(articleUrls) : articleUrls;
      if (typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('Clipboard tidak tersedia. Periksa izin browser, lalu coba lagi.');
      }
      await navigator.clipboard.writeText(formatWhatsappLinks(orderedUrls));
      setCopied({ articleId: row.articleId, order });
    } catch (error) {
      setCopied(null);
      setCopyError({
        articleId: row.articleId,
        message: error instanceof Error ? error.message : 'Gagal menyalin URL artikel.',
      });
    } finally {
      setCopyingArticleId(null);
    }
  };

  return (
    <section aria-label="Live Results V2" className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
            Live Results Control Tower
          </p>
          <h1 className="mt-1 font-sans text-xl font-semibold tracking-tight text-paper sm:text-2xl">
            Live Results
          </h1>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-paper-dim">
            Pantau hasil distribusi dan salin seluruh URL untuk dibagikan melalui WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/[0.06] font-mono text-[10px] text-emerald-400"
          >
            <Radio className="mr-1 h-3 w-3" /> Data tercatat
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-hairline bg-bg-raised p-3">
          <span className="font-mono text-[10px] uppercase text-paper-faint">Artikel tayang</span>
          <p className="mt-1 font-mono text-xl text-paper">
            {totalResults.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3">
          <span className="font-mono text-[10px] uppercase text-paper-faint">Hasil pada layar</span>
          <p className="mt-1 font-mono text-xl text-paper">
            {filtered.length.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {latest ? (
        <div className="rounded-lg border border-brass/20 bg-brass/[0.04] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-wider text-brass">
                Latest result
              </p>
              <h2 className="mt-1 truncate font-sans text-sm font-semibold text-paper">
                {latest.title}
              </h2>
              <p className="mt-1 truncate font-mono text-[10px] text-paper-dim">
                /{latest.slug} · {formatMoment(latest.publishedAt) ?? 'waktu belum tercatat'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-paper-dim">
              <Globe2 className="h-3.5 w-3.5 text-brass" /> {latest.urls.length} portal
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-hairline bg-bg-raised p-3">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" />
          <Input
            aria-label="Cari hasil distribusi"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCopied(null);
              setCopyError(null);
              setPage(1);
            }}
            placeholder="Cari judul, slug, organisasi, atau URL…"
            className="pl-9"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-paper-faint">
          {urls.length.toLocaleString('id-ID')} URL unik dari{' '}
          {filtered.length.toLocaleString('id-ID')} artikel yang cocok. Salin dilakukan per kartu
          artikel.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline-strong p-12 text-center">
          <Link2 className="mx-auto h-8 w-8 text-paper-faint" />
          <p className="mt-3 font-sans text-sm font-medium text-paper">
            Belum ada hasil pada pencarian ini.
          </p>
          <p className="mt-1 font-sans text-xs text-paper-dim">
            {results.length === 0
              ? 'Hasil akan muncul setelah distribusi tercatat.'
              : 'Ubah kata kunci pencarian.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((row) => {
            const primaryUrl = row.urls[0];
            return (
              <article
                key={row.articleId}
                className="rounded-lg border border-hairline bg-bg-raised p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <h2 className="min-w-0 truncate font-sans text-sm font-semibold text-paper">
                        {row.title}
                      </h2>
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {row.urls.length} portal
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-paper-dim">
                      /{row.slug} · {formatMoment(row.publishedAt) ?? 'waktu belum tercatat'}
                    </p>
                    {row.orgName ? (
                      <p className="mt-0.5 truncate font-sans text-[11px] text-paper-dim">
                        {crossOrg ? `Organisasi pemilik: ${row.orgName}` : row.orgName}
                      </p>
                    ) : crossOrg ? (
                      <p className="mt-0.5 truncate font-sans text-[11px] text-paper-dim">
                        Artikel lintas organisasi
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryUrl ? (
                      <a
                        href={primaryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded border border-hairline px-2.5 py-1.5 font-mono text-[10px] text-paper-dim hover:border-hairline-strong hover:text-paper"
                      >
                        <ExternalLink className="h-3 w-3" /> Buka portal
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={row.urls.length === 0 || copyingArticleId !== null}
                    aria-label={`Salin berurutan ${row.title}`}
                    onClick={() => void copyArticleLinks(row, 'ordered')}
                  >
                    {copyingArticleId === row.articleId ? (
                      'Menyalin…'
                    ) : copied?.articleId === row.articleId && copied.order === 'ordered' ? (
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="mr-1 h-3.5 w-3.5" />
                    )}{' '}
                    Salin berurutan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={row.urls.length === 0 || copyingArticleId !== null}
                    aria-label={`Salin acak ${row.title}`}
                    onClick={() => void copyArticleLinks(row, 'random')}
                  >
                    {copyingArticleId === row.articleId ? (
                      'Menyalin…'
                    ) : copied?.articleId === row.articleId && copied.order === 'random' ? (
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Shuffle className="mr-1 h-3.5 w-3.5" />
                    )}{' '}
                    Salin acak
                  </Button>
                </div>
                {copied?.articleId === row.articleId ? (
                  <p role="status" className="mt-2 font-mono text-[10px] text-emerald-400">
                    URL artikel ini disalin{' '}
                    {copied.order === 'ordered' ? 'berurutan' : 'dalam urutan acak'} dan siap
                    ditempel ke WhatsApp.
                  </p>
                ) : null}
                {copyError &&
                (copyError.articleId === row.articleId || copyError.articleId === '') ? (
                  <p role="alert" className="mt-2 font-mono text-[10px] text-amber-400">
                    {copyError.message}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <DashboardPager
        startIndex={(safePage - 1) * 20}
        visibleCount={visible.length}
        total={totalResults}
        page={safePage}
        pageCount={pageCount}
        onPageChange={setPage}
      />
      {nextCursor !== null && onLoadMoreArticles !== undefined ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore || copyingArticleId !== null}
            onClick={() => void loadMoreResults()}
          >
            {loadingMore ? 'Memuat hasil…' : 'Muat hasil lebih banyak'}
          </Button>
        </div>
      ) : null}

      <p className="font-mono text-[9px] text-paper-faint">
        Scope: {totalResults.toLocaleString('id-ID')} hasil tercatat · 20 artikel per halaman.
      </p>
    </section>
  );
}
