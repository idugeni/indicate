const BASE_PATHS = ['/', '/kebijakan-privasi', '/syarat-ketentuan', '/tentang', '/kontak', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml', '/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report', '/icon.png', '/apple-touch-icon.png', '/manifest.webmanifest'] as const;

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
 * @remarks Article bytes behind signed redirects purge through exact-URL purge only: the edge-cached 307s stay out of `paths` because Next path revalidation is unreliable for query-string route variants. Brand bytes (`/icon.png` et al.) are directly cached immutable responses, so they ride `paths` like any page. Sibling hostnames (`<region>.<apex>`) ride the same task so one dispatch busts regional copies sharing apex brand.
 */
export function completeInvalidationValues(input: CompleteInvalidationInput) {
  const hostnames = [...new Set([input.previousHostname ?? null, input.currentHostname ?? null, ...(input.siblingHostnames ?? [])].filter((value): value is string => value !== null))];
  const articleSlugs = [...new Set(input.articleSlugs ?? [])];
  const categorySlugs = [...new Set(input.categorySlugs ?? [])];
  const paths = new Set<string>(BASE_PATHS);
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
