export type CascadeSiteLevel = 'apex' | 'region' | 'city';

export interface CascadeSiteScope {
  readonly id: string;
  readonly domainId: string;
  readonly siteLevel: CascadeSiteLevel;
  readonly parentSiteId: string | null;
  readonly normalizedHostname: string;
  readonly status: string;
}

export interface CascadeTarget {
  readonly siteId: string;
  readonly originSiteId: string | null;
  readonly canonicalUrl: string | null;
}

export interface CascadeUnresolved {
  readonly originSiteId: string;
  readonly missing: 'apex' | 'region';
}

export interface CascadeExpansion {
  readonly targets: readonly CascadeTarget[];
  readonly unresolved: readonly CascadeUnresolved[];
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
 * @param source - Assignment origin marker, if known.
 * @param expandedFromSiteId - Manual origin of an auto row, if known.
 * @returns Family key; rows sharing a key never count as duplicates of each other.
 * @remarks Cascaded copies share their origin's canonical URL, so counting
 * them as duplicates of their own family would forbid every cascade.
 */
export function cascadeFamilyKey(
  siteId: string,
  source: 'manual' | 'auto' | null | undefined,
  expandedFromSiteId: string | null | undefined,
): string {
  return source === 'auto' && expandedFromSiteId !== null && expandedFromSiteId !== undefined
    ? `auto:${expandedFromSiteId}`
    : `manual:${siteId}`;
}

/**
 * Expand an explicit site selection into its cascade closure.
 *
 * @param sites - Active and inactive site rows carrying level and parent links.
 * @param originSiteIds - Explicitly requested site ids, in caller order.
 * @param articleSlug - Slug used for inherited canonical URLs of derived rows.
 * @returns Manual targets plus derived ancestor targets with origin links and canonical URLs.
 * @remarks The closure walks `parent_site_id`, never the geography table, so a
 * city can only reach a region portal that actually exists. City expands to
 * its region site plus the apex; region expands to the apex; apex expands to
 * nothing. Explicitly requested sites are always manual even when derivable.
 * Unresolvable ancestors are reported in `unresolved` instead of being
 * silently skipped, so callers can fail closed. The function is pure and
 * idempotent: expanding an already-closed set changes nothing.
 */
export function expandCascadeSites(
  sites: readonly CascadeSiteScope[],
  originSiteIds: readonly string[],
  articleSlug: string,
): CascadeExpansion {
  const active = sites.filter((site) => site.status === 'active');
  const byId = new Map(active.map((site) => [site.id, site]));

  const requested = [...new Set(originSiteIds)].filter((id) => byId.has(id));
  const requestedSet = new Set(requested);
  const targets: CascadeTarget[] = requested.map((siteId) => ({ siteId, originSiteId: null, canonicalUrl: null }));
  const seen = new Set(requested);
  const unresolved: CascadeUnresolved[] = [];

  for (const originId of requested) {
    const origin = byId.get(originId);
    if (origin === undefined) continue;

    const chain: CascadeSiteScope[] = [];
    let cursor: CascadeSiteScope | undefined = origin;
    for (const expected of requiredAncestors(origin.siteLevel)) {
      const parentId: string | null | undefined = cursor?.parentSiteId;
      const parent: CascadeSiteScope | undefined = parentId === null || parentId === undefined ? undefined : byId.get(parentId);
      if (parent === undefined || parent.siteLevel !== expected) {
        unresolved.push({ originSiteId: originId, missing: expected });
        break;
      }
      chain.push(parent);
      cursor = parent;
    }

    const primaryHostname = chain.at(-1)?.normalizedHostname ?? origin.normalizedHostname;
    for (const ancestor of chain) {
      if (requestedSet.has(ancestor.id) || seen.has(ancestor.id)) continue;
      seen.add(ancestor.id);
      targets.push({
        siteId: ancestor.id,
        originSiteId: originId,
        canonicalUrl: `https://${primaryHostname}/${articleSlug}`,
      });
    }
  }

  return { targets, unresolved };
}

/**
 * Expand a selection and refuse to return a partial hierarchy.
 *
 * @param sites - Site rows carrying level and parent links.
 * @param originSiteIds - Explicitly requested site ids.
 * @param articleSlug - Slug used for inherited canonical URLs of derived rows.
 * @returns The complete closure; identical to `expandCascadeSites(...).targets` when resolvable.
 * @throws {CascadeIncompleteError} When any requested portal has a missing or wrong-level ancestor.
 */
export function expandCascadeSitesStrict(
  sites: readonly CascadeSiteScope[],
  originSiteIds: readonly string[],
  articleSlug: string,
): readonly CascadeTarget[] {
  const expansion = expandCascadeSites(sites, originSiteIds, articleSlug);
  if (expansion.unresolved.length > 0) throw new CascadeIncompleteError(expansion.unresolved);
  return expansion.targets;
}
