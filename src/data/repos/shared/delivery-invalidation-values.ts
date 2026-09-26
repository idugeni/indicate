const SITE_PATHS = ['/', '/kebijakan-privasi', '/syarat-ketentuan', '/tentang', '/kontak', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml', '/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report', '/icon.png', '/apple-touch-icon.png', '/logo.png', '/manifest.webmanifest'] as const;

const ARTICLE_PATHS = ['/', '/tentang', '/llms.txt', '/news-sitemap.xml', '/rss.xml', '/sitemap.xml', '/tenant-home'] as const;

/**
 * Reasons that change only the article corpus of a site.
 *
 * @remarks `enqueuePublicInvalidation` derives `reason` from a template literal
 * (`publication.${state}`) and `dashboard` joins several aggregate reasons with
 * commas, so membership is tested per comma-separated segment. An unrecognised
 * reason is deliberately absent: it must widen to the complete set rather than
 * silently skip a page that did change.
 */
const ARTICLE_CORPUS_REASONS = new Set([
  'affiliation.changed',
  'article.changed',
  'article.robots.updated',
  'article_site.changed',
  'author.changed',
  'category.changed',
  'publication.published',
  'publication.unpublished',
  'publisher.changed',
]);

/**
 * Narrow the path set to the routes whose rendered output actually moved.
 *
 * @param reason - Comma-separated invalidation reason, possibly empty.
 * @returns `ARTICLE_PATHS` when every segment is an article-corpus reason, otherwise `SITE_PATHS`.
 * @remarks Measured against the tenant surfaces: `/` and `/tenant-home` render
 * `ListingPage`; `/tentang` renders `site.articles.length` twice in all ten
 * templates; `/llms.txt` renders the latest thirty articles and derives channel
 * names from them; the three feed routes list articles. The routes left out of
 * `ARTICLE_PATHS` read no article data — the legal documents interpolate only
 * the hostname, `/kontak` adds `settings.socialLinks`, `/robots.txt` is built by
 * `loadSiteRobots` from `siteSettings.seo.robots` alone, `/search` renders a bare
 * form for an empty query while result pages live on query-string variants that
 * `cacheLife('seconds')` and the `site:` tag already expire, `/report` reads its
 * slug from search params, and the four asset routes serve brand bytes.
 * Tags are unaffected: `host:`/`site:`/`org:` already expire the data cache for
 * every route, so the narrowed set only spares the route cache the renders that
 * would have produced identical HTML.
 */
function basePathsFor(reason: string): readonly string[] {
  const reasons = reason.split(',').map((value) => value.trim()).filter((value) => value !== '');
  if (reasons.length === 0) return SITE_PATHS;
  return reasons.every((value) => ARTICLE_CORPUS_REASONS.has(value)) ? ARTICLE_PATHS : SITE_PATHS;
}

export interface CompleteInvalidationInput {
  readonly organizationId: string;
  readonly siteId: string;
  readonly previousHostname?: string | null;
  readonly currentHostname?: string | null;
  readonly siblingHostnames?: readonly string[];
  readonly reason: string;
  readonly articleSlugs?: readonly string[];
  readonly categorySlugs?: readonly string[];
  readonly mediaIds?: readonly string[];
  readonly now?: Date;
}

/**
 * Build complete invalidation values for one delivery change.
 *
 * @param input - Invalidation input carrying hostnames, slugs, and media IDs.
 * @returns Pending invalidation row values with deduped tags, paths, and URLs.
 * @remarks Article bytes behind signed redirects purge through exact-URL purge only: the edge-cached 307s stay out of `paths` because Next path revalidation is unreliable for query-string route variants. Brand bytes (`/icon.png` et al.) are directly cached immutable responses, so every site-level reason carries them in `paths` like any page; article-corpus reasons leave them out because publishing cannot change brand bytes. Sibling hostnames (`<region>.<apex>`) ride the same task so one dispatch busts regional copies sharing apex brand. Narrowing the path set matters at network scale: a network-wide publication writes one row per portal, so every path held here is multiplied by the portal count and by the sibling-host fan-out on each `urls` entry.
 */
export function completeInvalidationValues(input: CompleteInvalidationInput) {
  const hostnames = [...new Set([input.previousHostname ?? null, input.currentHostname ?? null, ...(input.siblingHostnames ?? [])].filter((value): value is string => value !== null))];
  const articleSlugs = [...new Set(input.articleSlugs ?? [])];
  const categorySlugs = [...new Set(input.categorySlugs ?? [])];
  const paths = new Set<string>(basePathsFor(input.reason));
  for (const slug of articleSlugs) paths.add(`/${slug}`);
  for (const slug of categorySlugs) paths.add(`/categories/${slug}`);
  const tags = new Set([`org:${input.organizationId}`, `site:${input.siteId}`, ...hostnames.map((hostname) => `host:${hostname}`), ...articleSlugs.map((slug) => `article:${slug}`), ...(input.mediaIds ?? []).map((id) => `media:${id}`)]);
  const mediaUrls = (input.mediaIds ?? []).flatMap((id) => [`/api/network/media/${id}`, `/api/network/media/${id}?variant=thumb`]);
  const date = input.now ?? new Date();
  return {
    organizationId: input.organizationId,
    id: crypto.randomUUID(),
    siteId: input.siteId,
    previousHostname: input.previousHostname ?? null,
    currentHostname: input.currentHostname ?? null,
    tags: [...tags].sort(),
    paths: [...paths].sort(),
    urls: [...hostnames.flatMap((hostname) => [...paths].map((path) => `https://${hostname}${path}`)), ...hostnames.flatMap((hostname) => mediaUrls.map((path) => `https://${hostname}${path}`))].sort(),
    reason: input.reason,
    status: 'pending' as const,
    attempts: 0,
    nextAttemptAt: date,
    createdAt: date,
    updatedAt: date,
  };
}
