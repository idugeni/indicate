'use client';

import { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import { PublishedUrlBlock } from '@/modules/dashboard/components/publishing/published-url-block';

export interface PublishedArticleUrls {
  readonly articleId: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt: string | null;
  readonly urls: readonly string[];
}

interface ArticleInput {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly publishedAt?: string | null;
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

/** Article cards rendered per pass. Matches the editorial archive page size. */
const PAGE_SIZE = 20;

/**
 * Group every live portal URL per article, newest article first.
 *
 * @param input.articles - Articles in the caller's scope.
 * @param input.sites - Portal hostnames, keyed by site id.
 * @param input.articleSites - Assignment rows carrying the publication state.
 * @returns One entry per article that has at least one live URL, sorted newest first.
 * @remarks Only `published` rows count: an assignment that is still queued or
 * failed has no URL to share, and listing it would promise a link that 404s.
 * The URL falls back to `https://{hostname}/{slug}` — the shape the public
 * article route actually serves — so a row whose `published_url` was never
 * written still yields the address a reader can open.
 */
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
    if (row.publishedAt !== null && row.publishedAt !== undefined && (bucket.publishedAt === null || row.publishedAt > bucket.publishedAt)) {
      bucket.publishedAt = row.publishedAt;
    }
    urlsByArticle.set(row.articleId, bucket);
  }

  return [...urlsByArticle.entries()]
    .flatMap(([articleId, bucket]) => {
      const article = articleById.get(articleId);
      if (article === undefined) return [];
      return [{
        articleId,
        title: article.title,
        slug: article.slug,
        publishedAt: bucket.publishedAt ?? article.publishedAt ?? null,
        urls: [...new Set(bucket.urls)].sort((left, right) => left.localeCompare(right)),
      }];
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
  return moment === null ? 'Waktu tayang tidak tercatat' : `Tayang ${moment}`;
}

/**
 * Page listing every published article with its live URLs, ready to share.
 *
 * @param props.data - Editorial workspace payload (articles, sites, articleSites).
 * @returns One card per published article, each with a numbered copyable block, 20 per page.
 * @remarks Reads the state that is already durable, so the page shows the real
 * result without waiting on the publication worker: rows it lists are the ones
 * the reader can open right now. Pagination is by article rather than by URL so
 * a card's copyable block stays whole; one article can carry every portal in the
 * network, and splitting a block would break the paste-into-chat workflow the
 * page exists for.
 */
export function PublishedUrlBoard({ data }: { readonly data: unknown }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const model = (typeof data === 'object' && data !== null ? data : {}) as {
    readonly articles?: readonly ArticleInput[];
    readonly sites?: readonly SiteInput[];
    readonly articleSites?: readonly ArticleSiteInput[];
  };

  const published = useMemo(
    () => collectPublishedUrls({
      articles: model.articles ?? [],
      sites: model.sites ?? [],
      articleSites: model.articleSites ?? [],
    }),
    [model.articles, model.sites, model.articleSites],
  );

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (needle === ''
      ? published
      : published.filter((entry) => entry.title.toLowerCase().includes(needle) || entry.slug.toLowerCase().includes(needle))),
    [published, needle],
  );

  const totalUrls = published.reduce((sum, entry) => sum + entry.urls.length, 0);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <SectionCard icon={Link2} title="Hasil Tayang" eyebrow="Siap dishare">
        <div className="space-y-3">
          <p className="m-0 font-sans text-xs text-paper-dim">
            {published.length.toLocaleString('id-ID')} artikel tayang di {totalUrls.toLocaleString('id-ID')} portal. Salin satu blok per artikel untuk ditempel ke WhatsApp.
          </p>
          <Input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Cari judul atau slug artikel"
            aria-label="Cari artikel yang tayang"
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
          />
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState
          title={published.length === 0 ? 'Belum ada artikel yang tayang.' : 'Tidak ada artikel yang cocok.'}
          description={published.length === 0 ? 'Kirim artikel dari Antrean Penerbitan; hasilnya muncul di sini sendiri.' : 'Ubah kata kunci pencarian.'}
        />
      ) : (
        <>
          {visible.map((entry) => (
            <SectionCard key={entry.articleId} icon={Link2} title={entry.title} eyebrow={formatPublishedAt(entry.publishedAt)}>
              <p className="m-0 mb-2.5 font-mono text-[11px] text-paper-faint">/{entry.slug}</p>
              <PublishedUrlBlock title={entry.title} urls={entry.urls} />
            </SectionCard>
          ))}

          <DashboardPager
            startIndex={(safePage - 1) * PAGE_SIZE}
            visibleCount={visible.length}
            total={filtered.length}
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
