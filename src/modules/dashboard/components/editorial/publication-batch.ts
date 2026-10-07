/**
 * Batch a publication fan-out into chunks the server accepts.
 *
 * The publishing schemas cap `siteIds` at 100 per command, so a network with more
 * apex portals than that can never be published in one request. The count is not a
 * constant to hardcode: it follows the org's live apex count, so a small tenant
 * sends one batch and the full network sends several.
 */

/** Server-side `siteIds` ceiling shared by request, suggest, and bulk schemas. */
export const PUBLICATION_BATCH_LIMIT = 100;

export interface PublishTargetSite {
  readonly id: string;
  readonly regionId?: string | null;
  readonly siteLevel?: string;
  readonly status?: string;
  readonly activationState?: string;
}

/**
 * Which portals a single article may reach.
 *
 * `apex` is the national fallback used when the editor picked no city. `city`
 * narrows the fan-out to one city's portals, one per domain.
 */
export type PublicationScope =
  | { readonly kind: 'apex' }
  | { readonly kind: 'city'; readonly regionId: string };

/**
 * Pick the live portals a single article may be published to.
 *
 * @param sites - Every site in the organization, at any tree level.
 * @param scope - Apex fallback, or the city whose portals should carry the article.
 * @returns Target ids in stable order, with duplicates removed.
 *
 * @remarks Region portals are never included: the publishing service refuses a
 * request that names one, because a region portal only lists its cities' articles
 * and cannot carry an article of its own. A city scope deliberately excludes the
 * apex portals too, since an apex portal is national and carries every city, so
 * including it would put a Wonosobo story on all 134 of them.
 */
export function selectPublicationTargets(sites: readonly PublishTargetSite[], scope: PublicationScope): readonly string[] {
  const live = sites.filter((site) => site.status === 'active' && site.activationState === 'active' && site.siteLevel !== 'region');
  const scoped = scope.kind === 'city'
    ? live.filter((site) => site.siteLevel === 'city' && site.regionId === scope.regionId)
    : live.filter((site) => site.siteLevel === 'apex');
  return [...new Set(scoped.map((site) => site.id))];
}

/**
 * Split target ids into batches that each fit one server command.
 *
 * @param siteIds - Target portal ids, in any order.
 * @param limit - Maximum ids per batch; defaults to the server ceiling.
 * @returns Batches in input order; an empty input yields no batches.
 */
export function chunkPublicationTargets(siteIds: readonly string[], limit: number = PUBLICATION_BATCH_LIMIT): readonly (readonly string[])[] {
  if (siteIds.length === 0) return [];
  const size = Math.max(1, Math.floor(limit));
  const batches: string[][] = [];
  for (let index = 0; index < siteIds.length; index += size) {
    batches.push(siteIds.slice(index, index + size));
  }
  return batches;
}
