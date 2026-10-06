'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Radio,
  Search,
  Share2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import { PublishedUrlBlock } from '@/modules/dashboard/components/publishing/published-url-block';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { AppTooltip } from '@/ui/app-tooltip';

export interface PublishedArticleUrls {
  readonly articleId: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt: string | null;
  readonly urls: readonly string[];
  readonly orgName?: string | undefined;
}

interface ArticleInput {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt?: string | null;
  readonly publishedUrls?: readonly string[] | undefined;
  readonly publishedAtMax?: string | null | undefined;
  readonly orgName?: string | undefined;
  readonly orgSlug?: string | undefined;
}

interface SiteInput {
  readonly id: string;
  readonly normalizedHostname: string;
}

interface ArticleSiteInput {
  readonly articleId: string;
  readonly siteId: string;
  readonly state: string;
  readonly publishedUrl?: string | null;
  readonly publishedAt?: string | null;
}

type SortOption = 'newest' | 'oldest' | 'most-syndicated' | 'alphabetical';

const PAGE_SIZE = 20;

export function collectPublishedUrls(input: {
  readonly articles: readonly ArticleInput[];
  readonly sites: readonly SiteInput[];
  readonly articleSites: readonly ArticleSiteInput[];
}): readonly PublishedArticleUrls[] {
  const siteHosts = new Map(input.sites.map((site) => [site.id, site.normalizedHostname]));
  const articleById = new Map(input.articles.map((article) => [article.id, article]));

  const urlsByArticle = new Map<string, { urls: string[]; publishedAt: string | null }>();
  for (const row of input.articleSites) {
    if (row.state !== 'published') continue;
    const article = articleById.get(row.articleId);
    const host = siteHosts.get(row.siteId);
    if (article === undefined || host === undefined) continue;
    const url = row.publishedUrl ?? `https://${host}/${article.slug}`;
    const bucket = urlsByArticle.get(row.articleId) ?? { urls: [], publishedAt: null };
    bucket.urls.push(url);
    if (
      row.publishedAt !== null &&
      row.publishedAt !== undefined &&
      (bucket.publishedAt === null || row.publishedAt > bucket.publishedAt)
    ) {
      bucket.publishedAt = row.publishedAt;
    }
    urlsByArticle.set(row.articleId, bucket);
  }

  return [...urlsByArticle.entries()]
    .flatMap(([articleId, bucket]) => {
      const article = articleById.get(articleId);
      if (article === undefined) return [];
      return [
        {
          articleId,
          title: article.title,
          slug: article.slug,
          publishedAt: bucket.publishedAt ?? article.publishedAt ?? null,
          urls: [...new Set(bucket.urls)].sort((left, right) => left.localeCompare(right)),
        },
      ];
    })
    .sort((left, right) => {
      if (left.publishedAt === right.publishedAt) return left.title.localeCompare(right.title, 'id-ID');
      if (left.publishedAt === null) return 1;
      if (right.publishedAt === null) return -1;
      return right.publishedAt.localeCompare(left.publishedAt);
    });
}

function formatPublishedAt(value: string | null): string {
  const moment = formatMoment(value);
  return moment === null ? 'Jadwal belum tercatat' : `Tayang ${moment}`;
}

export function PublishedUrlBoard({ data, onFilterApply, articlesNextCursor, articlesTotal, onLoadMoreArticles, organizationId, crossOrg }: {
  readonly data: unknown;
  readonly onFilterApply?: ((query: string) => void) | undefined;
  readonly articlesNextCursor?: string | null | undefined;
  readonly articlesTotal?: number | undefined;
  readonly onLoadMoreArticles?: (() => Promise<{ readonly loaded: number; readonly total: number; readonly nextCursor: string | null } | null>) | undefined;
  readonly organizationId?: string | undefined;
  readonly crossOrg?: boolean | undefined;
}) {
  const searchInputId = useId();
  const sortSelectId = useId();

  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('newest');
  const [copiedSlugId, setCopiedSlugId] = useState<string | null>(null);
  const [page, setPage] = useDashboardPage('publishedPage');

  const model = (typeof data === 'object' && data !== null ? data : {}) as {
    readonly articles?: readonly ArticleInput[];
    readonly sites?: readonly SiteInput[];
    readonly articleSites?: readonly ArticleSiteInput[];
    readonly bridgePublished?: readonly { readonly articleId: string; readonly urls: readonly string[]; readonly publishedAtMax: string | null }[];
    readonly total?: number;
    readonly articlesNextCursor?: string | null;
  };

  const crossOrgActive = crossOrg === true;
  const published = useMemo(() => {
    const rows = model.articles ?? [];
    const collected = crossOrgActive && rows.some((article) => Array.isArray(article.publishedUrls))
      ? rows
        .filter((article) => Array.isArray(article.publishedUrls) && (article.publishedUrls as readonly string[]).length > 0)
        .map((article) => ({
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          publishedAt: article.publishedAtMax ?? article.publishedAt ?? null,
          urls: [...new Set(article.publishedUrls as readonly string[])].sort((left, right) => left.localeCompare(right)),
          ...(typeof article.orgName === 'string' && article.orgName !== '' ? { orgName: article.orgName } : {}),
        }))
      : collectPublishedUrls({
        articles: rows,
        sites: model.sites ?? [],
        articleSites: model.articleSites ?? [],
      });
    const bridge = model.bridgePublished ?? [];
    if (bridge.length === 0) return collected;
    const byId = new Map(collected.map((entry) => [entry.articleId, { ...entry, urls: [...entry.urls] }]));
    const articleById = new Map(rows.map((article) => [article.id, article]));
    for (const row of bridge) {
      const existing = byId.get(row.articleId);
      if (existing !== undefined) {
        existing.urls = [...new Set([...existing.urls, ...row.urls])].sort((left, right) => left.localeCompare(right));
        if (row.publishedAtMax !== null && (existing.publishedAt === null || row.publishedAtMax > existing.publishedAt)) {
          existing.publishedAt = row.publishedAtMax;
        }
        continue;
      }
      const article = articleById.get(row.articleId);
      if (article === undefined || row.urls.length === 0) continue;
      byId.set(row.articleId, {
        articleId: row.articleId,
        title: article.title,
        slug: article.slug,
        publishedAt: row.publishedAtMax ?? article.publishedAt ?? null,
        urls: [...new Set(row.urls)].sort((left, right) => left.localeCompare(right)),
      });
    }
    return [...byId.values()].sort((left, right) => {
      if (left.publishedAt === right.publishedAt) return left.title.localeCompare(right.title, 'id-ID');
      if (left.publishedAt === null) return 1;
      if (right.publishedAt === null) return -1;
      return right.publishedAt.localeCompare(left.publishedAt);
    });
  },
    [model.articles, model.sites, model.articleSites, model.bridgePublished, crossOrgActive],
  );

  /**
   * Search and sort run on the server (same predicates the board used to
   * apply locally); the rows below only group assignments per article.
   */
  useEffect(() => {
    if (onFilterApply === undefined) return;
    const needle = query.trim();
    const serverSort = sortOrder === 'newest' ? 'published-desc' : sortOrder === 'oldest' ? 'published-asc' : sortOrder === 'alphabetical' ? 'title' : 'syndicated';
    const parts = [
      'publicationState=published',
      `sort=${serverSort}`,
      ...(needle === '' ? [] : [`search=${encodeURIComponent(needle)}`]),
    ];
    const timer = window.setTimeout(() => {
      onFilterApply(`&${parts.join('&')}`);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, sortOrder, onFilterApply, setPage]);

  const serverTotal = model.total ?? articlesTotal;
  const nextCursor = model.articlesNextCursor ?? articlesNextCursor ?? null;

  const needle = query.trim().toLowerCase();

  /**
   * The server applies the same title/slug match and the requested sort, so
   * this re-filter only narrows the loaded window idempotently while the
   * first page is still arriving. Row order always stays server-owned to keep
   * appended pages coherent.
   */
  const filtered = useMemo(() => {
    if (needle === '') return [...published];
    return published.filter(
      (entry) =>
        entry.title.toLowerCase().includes(needle) ||
        entry.slug.toLowerCase().includes(needle),
    );
  }, [published, needle]);

  // Standalone (tests, no server paging): the client filter is authoritative.
  // Server-driven: the server already filtered; the total rides the payload.
  const total = serverTotal ?? filtered.length;

  const totalUrls = useMemo(
    () => published.reduce((sum, entry) => sum + entry.urls.length, 0),
    [published],
  );

  const averageSyndication = useMemo(() => {
    if (published.length === 0) return '0';
    return (totalUrls / published.length).toFixed(1);
  }, [published, totalUrls]);

  const fillingRef = useRef(false);
  const goToPage = (next: number) => {
    setPage(next);
    if (onLoadMoreArticles === undefined || fillingRef.current) return;
    void (async () => {
      fillingRef.current = true;
      try {
        let guard = 0;
        let state = { loaded: published.length, cursor: nextCursor };
        while (next * PAGE_SIZE > state.loaded && state.cursor !== null && guard++ < 10) {
          const result = await onLoadMoreArticles();
          if (result === null) break;
          state = { loaded: result.loaded, cursor: result.nextCursor };
        }
      } finally {
        fillingRef.current = false;
      }
    })();
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCopySlug = (articleId: string, slug: string) => {
    void navigator.clipboard.writeText(slug);
    setCopiedSlugId(articleId);
    toast.success(`Slug “${slug}” disalin ke papan klip.`);
    setTimeout(() => setCopiedSlugId(null), 2000);
  };

  const handleCopyAllSummary = () => {
    if (filtered.length === 0) return;
    const payload = filtered
      .slice(0, 50)
      .map((entry) => `${entry.title}\n${entry.urls.join('\n')}`)
      .join('\n\n---\n\n');

    void navigator.clipboard.writeText(payload);
    toast.success(`Daftar tautan ${Math.min(filtered.length, 50)} artikel disalin.`);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        icon={Link2}
        title="Distribusi Siaran & Tautan Tayang"
        eyebrow="Monitoring Sindikasi Publikasi"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-hairline bg-bg p-3">
              <div className="flex items-center gap-2 text-paper-dim">
                <Radio className="h-3.5 w-3.5 text-brass" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Artikel Tayang</span>
              </div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-paper">
                {published.length.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="rounded-md border border-hairline bg-bg p-3">
              <div className="flex items-center gap-2 text-paper-dim">
                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Tautan Portal Aktif</span>
              </div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-paper">
                {totalUrls.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="col-span-2 rounded-md border border-hairline bg-bg p-3 sm:col-span-1">
              <div className="flex items-center gap-2 text-paper-dim">
                <Share2 className="h-3.5 w-3.5 text-brass" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Rata-Rata Sebaran</span>
              </div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-paper">
                {averageSyndication} <span className="font-sans text-xs font-normal text-paper-dim">portal/berita</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={searchInputId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Cari Berita
              </label>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-paper-dim" />
                <Input
                  id={searchInputId}
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Ketik judul artikel atau kode slug..."
                  className="h-9 rounded-md border-hairline-strong bg-bg pl-9 pr-8 font-sans text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
                {query !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setPage(1);
                    }}
                    className="absolute right-2.5 rounded p-0.5 text-paper-dim hover:text-paper"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-1.5 sm:w-56">
              <label
                htmlFor={sortSelectId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Urutan Tampilan
              </label>
              <DashboardSelect
                id={sortSelectId}
                value={sortOrder}
                onValueChange={(val) => setSortOrder((val as SortOption) ?? 'newest')}
                placeholder="Pilih urutan"
              >
                <DashboardSelectItem value="newest">Terbaru Ditayangkan</DashboardSelectItem>
                <DashboardSelectItem value="oldest">Terlama Ditayangkan</DashboardSelectItem>
                <DashboardSelectItem value="most-syndicated">Jaringan Portal Terbanyak</DashboardSelectItem>
                <DashboardSelectItem value="alphabetical">Abjad Judul (A-Z)</DashboardSelectItem>
              </DashboardSelect>
            </div>

            {filtered.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyAllSummary}
                className="h-9 shrink-0 gap-1.5 rounded-md border-hairline-strong px-3 font-sans text-xs hover:border-hairline"
              >
                <Copy className="h-3.5 w-3.5 text-brass" />
                <span className="hidden md:inline">Salin Batch Laman</span>
                <span className="md:hidden">Salin</span>
              </Button>
            )}
          </div>
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState
          title={published.length === 0 ? 'Belum ada artikel yang tayang di jaringan' : 'Tidak ada berita yang cocok'}
          description={
            published.length === 0
              ? 'Artikel yang disetujui dan disiarkan melalui antrean penerbitan akan muncul secara otomatis di sini.'
              : 'Coba ubah kata kunci pencarian atau bersihkan filter.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs text-paper-dim">
              Menampilkan {visible.length.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')} artikel tersindikasi
            </span>
          </div>

          {visible.map((entry) => {
            const isSlugCopied = copiedSlugId === entry.articleId;
            const primaryUrl = entry.urls[0];

            return (
              <SectionCard
                key={entry.articleId}
                icon={Link2}
                title={entry.title}
                eyebrow={formatPublishedAt(entry.publishedAt)}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <AppTooltip label="Klik untuk menyalin slug">
                        <button
                          type="button"
                          onClick={() => handleCopySlug(entry.articleId, entry.slug)}
                          className="group inline-flex items-center gap-1 rounded bg-bg px-2 py-0.5 font-mono text-[11px] text-paper-dim transition hover:bg-bg-raised hover:text-paper"
                        >
                          <span>/{entry.slug}</span>
                          {isSlugCopied ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      </AppTooltip>

                      <Badge
                        variant="outline"
                        className="border-brass/30 bg-brass/10 font-mono text-[10px] text-brass"
                      >
                        {entry.urls.length} Portal Aktif
                      </Badge>
                      {typeof entry.orgName === 'string' && entry.orgName !== '' ? (
                        <Badge variant="outline" className="max-w-48 truncate font-sans text-[10px] text-paper-dim">
                          {entry.orgName}
                        </Badge>
                      ) : null}
                    </div>

                    {primaryUrl && (
                      <a
                        href={primaryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-paper-dim transition hover:text-brass"
                      >
                        <span>Kunjungi Portal Utama</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <PublishedUrlBlock title={entry.title} urls={entry.urls} organizationId={organizationId} />
                </div>
              </SectionCard>
            );
          })}

          <div className="mt-2 border-t border-hairline/60 pt-2">
            <DashboardPager
              startIndex={(safePage - 1) * PAGE_SIZE}
              visibleCount={visible.length}
              total={total}
              page={safePage}
              pageCount={pageCount}
              onPageChange={goToPage}
            />
            {onLoadMoreArticles !== undefined && nextCursor !== null ? (
              <div className="mt-3 flex justify-center">
                <Button type="button" variant="outline" size="sm" onClick={() => void onLoadMoreArticles()}>
                  Muat lebih lama
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}