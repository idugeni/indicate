export type CascadeSiteLevel = 'apex' | 'region' | 'city';

export interface CascadeSiteScope {
  readonly id: string;
  readonly siteLevel: CascadeSiteLevel;
  readonly parentSiteId: string | null;
  readonly status: string;
}

export interface CascadeUnresolved {
  readonly originSiteId: string;
  readonly missing: 'apex' | 'region';
}

/** Raised when a requested portal cannot be expanded into a complete hierarchy. */
export class CascadeIncompleteError extends Error {
  constructor(readonly unresolved: readonly CascadeUnresolved[]) {
    super(
      `cascade_hierarchy_incomplete: ${unresolved
        .map((entry) => `${entry.originSiteId} missing ${entry.missing}`)
        .join(', ')}`,
    );
    this.name = 'CascadeIncompleteError';
  }
}

/**
 * Ancestor levels every level must reach, nearest first.
 *
 * @param level - Level of the portal being expanded.
 * @returns Required ancestor levels; empty for the apex.
 */
function requiredAncestors(level: CascadeSiteLevel): readonly Exclude<CascadeSiteLevel, 'city'>[] {
  if (level === 'city') return ['region', 'apex'];
  if (level === 'region') return ['apex'];
  return [];
}

/**
 * Derive the duplicate-counting family for one site row.
 *
 * @param siteId - Site carrying the content.
 * @param expandedFromSiteId - Manual origin of an auto row, if known.
 * @returns Family key; rows sharing a key never count as duplicates of each other.
 * @remarks A region and an apex list their descendant cities' articles rather
 * than owning copies, so a city and every ancestor that inherits it are one
 * family. Keying on the origin collapses that closure; keying on the assignment
 * source would not, and would forbid the city's own publication.
 */
export function cascadeFamilyKey(
  siteId: string,
  expandedFromSiteId: string | null | undefined,
): string {
  return expandedFromSiteId !== null && expandedFromSiteId !== undefined
    ? `origin:${expandedFromSiteId}`
    : `origin:${siteId}`;
}

/**
 * Report requested portals whose ancestor chain is incomplete.
 *
 * @param sites - Active and inactive site rows carrying level and parent links.
 * @param siteIds - Portals the caller wants to publish to.
 * @returns One entry per portal missing an ancestor, empty when every chain resolves.
 * @remarks The walk follows `parent_site_id`, never the geography table, so a
 * city can only reach a region portal that actually exists. Nothing is derived
 * from the result: a region and an apex read their cities' articles through the
 * delivery lineage rather than holding copies. This exists so a portal that
 * could never show the article is refused before a row is written, instead of
 * publishing into a chain that a reader would find empty.
 */
export function unresolvedCascadeAncestors(
  sites: readonly CascadeSiteScope[],
  siteIds: readonly string[],
): readonly CascadeUnresolved[] {
  const byId = new Map(sites.filter((site) => site.status === 'active').map((site) => [site.id, site]));
  const unresolved: CascadeUnresolved[] = [];
  for (const siteId of new Set(siteIds)) {
    const origin = byId.get(siteId);
    if (origin === undefined) continue;
    let cursor: CascadeSiteScope | undefined = origin;
    for (const expected of requiredAncestors(origin.siteLevel)) {
      const parentId: string | null | undefined = cursor?.parentSiteId;
      const parent: CascadeSiteScope | undefined = parentId === null || parentId === undefined ? undefined : byId.get(parentId);
      if (parent === undefined || parent.siteLevel !== expected) {
        unresolved.push({ originSiteId: siteId, missing: expected });
        break;
      }
      cursor = parent;
    }
  }
  return unresolved;
}
