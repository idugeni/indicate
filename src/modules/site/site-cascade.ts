export interface CascadeSiteScope {
  readonly id: string;
  readonly domainId: string;
  readonly regionId: string | null;
  readonly normalizedHostname: string;
  readonly status: string;
}

export interface CascadeRegionScope {
  readonly id: string;
  readonly kind: 'region' | 'city';
  readonly parentRegionId: string | null;
  readonly status: string;
}

export interface CascadeTarget {
  readonly siteId: string;
  readonly originSiteId: string | null;
  readonly canonicalUrl: string | null;
}

export interface CascadeExpansion {
  readonly targets: readonly CascadeTarget[];
  readonly unresolved: readonly { readonly originSiteId: string; readonly missing: 'apex' | 'region' }[];
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
 * @param regions - Region rows carrying kind and parent links.
 * @param originSiteIds - Explicitly requested site ids, in caller order.
 * @param articleSlug - Slug used for inherited canonical URLs of derived rows.
 * @returns Manual targets plus derived region/apex targets with origin links and canonical URLs.
 * @remarks City expands to its parent region site plus the domain apex; region
 * expands to the apex; apex expands to nothing. Explicitly requested sites are
 * always manual even when derivable. The function is pure and idempotent:
 * expanding an already-closed set changes nothing.
 */
export function expandCascadeSites(
  sites: readonly CascadeSiteScope[],
  regions: readonly CascadeRegionScope[],
  originSiteIds: readonly string[],
  articleSlug: string,
): CascadeExpansion {
  const active = sites.filter((site) => site.status === 'active');
  const byId = new Map(active.map((site) => [site.id, site]));
  const regionById = new Map(regions.map((region) => [region.id, region]));
  const apexOf = (domainId: string): CascadeSiteScope | undefined =>
    active.find((site) => site.domainId === domainId && site.regionId === null);
  const regionSiteOf = (domainId: string, regionId: string): CascadeSiteScope | undefined =>
    active.find((site) => site.domainId === domainId && site.regionId === regionId);

  const requested = [...new Set(originSiteIds)].filter((id) => byId.has(id));
  const requestedSet = new Set(requested);
  const targets: CascadeTarget[] = requested.map((siteId) => ({ siteId, originSiteId: null, canonicalUrl: null }));
  const seen = new Set(requested);
  const unresolved: { originSiteId: string; missing: 'apex' | 'region' }[] = [];

  const addDerived = (originId: string, site: CascadeSiteScope, primaryHostname: string): void => {
    if (requestedSet.has(site.id) || seen.has(site.id)) return;
    seen.add(site.id);
    targets.push({ siteId: site.id, originSiteId: originId, canonicalUrl: `https://${primaryHostname}/${articleSlug}` });
  };

  for (const originId of requested) {
    const origin = byId.get(originId);
    if (origin === undefined || origin.regionId === null) continue;
    const region = regionById.get(origin.regionId);
    if (region === undefined || region.status !== 'active') continue;
    const apex = apexOf(origin.domainId);
    const primaryHostname = apex !== undefined ? apex.normalizedHostname : origin.normalizedHostname;
    if (region.kind === 'city') {
      const parent = region.parentRegionId === null ? undefined : regionSiteOf(origin.domainId, region.parentRegionId);
      if (parent === undefined) unresolved.push({ originSiteId: originId, missing: 'region' });
      else addDerived(originId, parent, primaryHostname);
    }
    if (apex === undefined) unresolved.push({ originSiteId: originId, missing: 'apex' });
    else addDerived(originId, apex, primaryHostname);
  }

  return { targets, unresolved };
}
