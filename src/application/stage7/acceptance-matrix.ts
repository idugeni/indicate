import type {
  Stage7AcceptanceObservation,
  Stage7AcceptanceReport,
  Stage7ReadinessFixture,
} from '@/domain/stage7/models';

function urlsUseHostname(urls: readonly string[], hostname: string): boolean {
  return urls.every((value) => {
    try { return new URL(value).protocol === 'https:' && new URL(value).hostname === hostname; }
    catch { return false; }
  });
}

export function verifyStage7AcceptanceMatrix(
  fixture: Stage7ReadinessFixture,
  observations: readonly Stage7AcceptanceObservation[],
): Stage7AcceptanceReport {
  const expected = new Map(fixture.regionalMatrix.map((site) => [site.normalizedHostname, site]));
  const failures = new Set<string>();
  const observedHosts = observations.map(({ hostname }) => hostname);
  if (observations.length !== expected.size || new Set(observedHosts).size !== observations.length
    || observedHosts.some((hostname) => !expected.has(hostname))) failures.add('matrix_cardinality');

  const cacheKeys = new Set<string>();
  const denialShapes = new Set<string>();
  for (const observation of observations) {
    const site = expected.get(observation.hostname);
    if (site === undefined) { failures.add('unexpected_scenario'); continue; }
    const region = fixture.regions.find(({ id }) => id === site.regionId);
    if (region === undefined || observation.regionSlug !== region.slug) failures.add('region_context');
    if (observation.organizationId !== site.organizationId || observation.siteId !== site.id) failures.add('tenant_context');
    if (observation.publication.state !== 'published' || observation.publication.successfulCount < 1
      || observation.publication.urls.length !== observation.publication.successfulCount
      || !urlsUseHostname(observation.publication.urls, observation.hostname)) failures.add('publication_result');
    if (!observation.publicSelectionIsIsolated || observation.publicArticleRegionIds.length === 0
      || observation.publicArticleRegionIds.some((regionId) => regionId !== site.regionId)) failures.add('public_selection');
    if (observation.media.authorizedKey === null || !observation.media.crossTenantDenied) failures.add('media_authorization');
    if (observation.seoUrls.length === 0 || !urlsUseHostname(observation.seoUrls, observation.hostname)) failures.add('seo_hostname');
    if (observation.cacheIdentity.length === 0 || cacheKeys.has(observation.cacheIdentity) || !observation.foreignCacheRejected) failures.add('cache_partition');
    cacheKeys.add(observation.cacheIdentity);
    if (observation.denialShape.length === 0) failures.add('denial_shape');
    if (!observation.credentialCrossTenantDenied) failures.add('credential_isolation');
    denialShapes.add(observation.denialShape);
    if (observation.analyticsOrganizationId !== observation.organizationId || observation.analyticsArticleCount < 1) failures.add('analytics_scope');
    if (observation.telegram.state !== observation.publication.state
      || observation.telegram.urls.length !== observation.publication.urls.length
      || !urlsUseHostname(observation.telegram.urls, observation.hostname)
      || observation.publication.urls.some((url) => !observation.telegram.urls.includes(url))) failures.add('telegram_projection');
    if (observation.auditOrganizationIds.length === 0
      || observation.auditOrganizationIds.some((organizationId) => organizationId !== observation.organizationId)) failures.add('audit_scope');
  }
  if (denialShapes.size !== 1) failures.add('non_disclosing_denial');

  return Object.freeze({
    accepted: failures.size === 0,
    scenarioCount: observations.length,
    failures: Object.freeze([...failures].sort()),
  });
}
