const BASE_PATHS = ['/', '/articles', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml'] as const;

export interface CompleteInvalidationInput {
  readonly organizationId: string;
  readonly siteId: string;
  readonly previousHostname?: string | null;
  readonly currentHostname?: string | null;
  readonly reason: string;
  readonly articleSlugs?: readonly string[];
  readonly categorySlugs?: readonly string[];
  readonly mediaIds?: readonly string[];
  readonly now?: Date;
}

export function completeInvalidationValues(input: CompleteInvalidationInput) {
  const hostnames = [...new Set([input.previousHostname ?? null, input.currentHostname ?? null].filter((value): value is string => value !== null))];
  const articleSlugs = [...new Set(input.articleSlugs ?? [])];
  const categorySlugs = [...new Set(input.categorySlugs ?? [])];
  const paths = new Set<string>(BASE_PATHS);
  for (const slug of articleSlugs) paths.add(`/articles/${slug}`);
  for (const slug of categorySlugs) paths.add(`/categories/${slug}`);
  const tags = new Set([`org:${input.organizationId}`, `site:${input.siteId}`, ...hostnames.map((hostname) => `host:${hostname}`), ...articleSlugs.map((slug) => `article:${slug}`), ...(input.mediaIds ?? []).map((id) => `media:${id}`)]);
  // Media bytes are never cached, but their edge-cached 307 redirects are:
  // purge the media route (full + thumb twin) through exact-URL purge only.
  // They stay out of `paths` because Next path revalidation is unreliable for
  // query-string route variants.
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
