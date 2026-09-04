import type {
  AnalyticsPoint,
  AnalyticsProjection,
  ArticleFilter,
  ArticleRecord,
  AuditFilter,
  AuditRecord,
  DashboardProjection,
  OfficialAffiliationRecord,
  NetworkPublisherClaim,
  PublisherRecord,
  DashboardTenantState,
} from '@/modules/dashboard/models';

function group(values: readonly string[]): readonly AnalyticsPoint[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => ({ key, count }));
}

export function filterArticles(state: DashboardTenantState, filter: ArticleFilter): readonly ArticleRecord[] {
  const query = filter.search?.trim().toLocaleLowerCase();
  return state.articles.filter((article) => {
    if (article.organizationId !== state.organizationId) return false;
    if (filter.regionId !== undefined && article.regionId !== filter.regionId) return false;
    if (filter.categoryId !== undefined && article.categoryId !== filter.categoryId) return false;
    if (filter.publisherId !== undefined && article.publisherId !== filter.publisherId) return false;
    if (filter.authorId !== undefined && article.authorId !== filter.authorId) return false;
    const assignments = state.articleSites.filter((assignment) => assignment.organizationId === state.organizationId && assignment.articleId === article.id && assignment.active);
    if ((filter.siteId !== undefined || filter.publicationState !== undefined) && !assignments.some((assignment) =>
      (filter.siteId === undefined || assignment.siteId === filter.siteId)
      && (filter.publicationState === undefined || assignment.state === filter.publicationState))) return false;
    return query === undefined || query.length === 0
      || article.title.toLocaleLowerCase().includes(query)
      || article.body.toLocaleLowerCase().includes(query)
      || article.source.toLocaleLowerCase().includes(query);
  });
}

export function selectNetworkArticles(
  state: DashboardTenantState,
  siteId: string,
  filter: ArticleFilter = {},
): readonly ArticleRecord[] {
  const site = state.sites.find((candidate) => candidate.organizationId === state.organizationId
    && candidate.id === siteId
    && candidate.status === 'active'
    && candidate.activationState === 'active');
  if (site === undefined) return [];
  return filterArticles(state, { ...filter, siteId }).filter((article) => {
    if (article.status !== 'active') return false;
    const region = state.regions.find((candidate) => candidate.organizationId === state.organizationId && candidate.id === article.regionId && candidate.status === 'active');
    if (region === undefined) return false;
    if (site.regionId !== null && (region.id !== site.regionId || state.regions.find((candidate) => candidate.organizationId === state.organizationId && candidate.id === site.regionId && candidate.status === 'active') === undefined)) return false;
    return state.articleSites.some((assignment) => assignment.organizationId === state.organizationId && assignment.articleId === article.id
      && assignment.siteId === siteId
      && assignment.active
      && assignment.state === 'published');
  });
}

export function buildNetworkPublisherClaim(
  publisher: PublisherRecord,
  affiliations: readonly OfficialAffiliationRecord[],
  siteId: string,
): NetworkPublisherClaim {
  const matching = publisher.verificationStatus === 'verified'
    ? affiliations.find((affiliation) => affiliation.publisherId === publisher.id
      && affiliation.siteId === siteId
      && affiliation.active
      && affiliation.verifiedAt !== null)
    : undefined;
  return Object.freeze({
    attribution: publisher.attributionLabel,
    independent: publisher.type === 'independent_publisher',
    institutionName: matching?.institutionName ?? null,
    claimScopes: matching?.claimScopes ?? [],
  });
}

export function buildDashboard(state: DashboardTenantState): DashboardProjection {
  const states = ['queued', 'processing', 'published', 'failed', 'retrying'] as const;
  const tenant = state.organizationId;
  return Object.freeze({
    activeDomains: state.domains.filter(({ organizationId, status }) => organizationId === tenant && status === 'active').length,
    activeSites: state.sites.filter(({ organizationId, status }) => organizationId === tenant && status === 'active').length,
    activeArticles: state.articles.filter(({ organizationId, status }) => organizationId === tenant && status === 'active').length,
    archivedArticles: state.articles.filter(({ organizationId, status }) => organizationId === tenant && status === 'archived').length,
    jobsByState: Object.fromEntries(states.map((jobState) => [jobState, state.publishingJobs.filter(({ organizationId, state: value }) => organizationId === tenant && value === jobState).length])) as DashboardProjection['jobsByState'],
    successfulSiteOutcomes: state.articleSites.filter(({ organizationId, state: value }) => organizationId === tenant && value === 'published').length,
    failedSiteOutcomes: state.articleSites.filter(({ organizationId, state: value }) => organizationId === tenant && value === 'failed').length,
    activeMedia: state.media.filter(({ organizationId, state: value }) => organizationId === tenant && value === 'active').length,
  });
}

export function buildAnalytics(
  state: DashboardTenantState,
  filter: { readonly from?: string | undefined; readonly to?: string | undefined } = {},
): AnalyticsProjection {
  const inRange = (date: string) => (filter.from === undefined || date >= filter.from)
    && (filter.to === undefined || date <= filter.to);
  const tenant = state.organizationId;
  const allTenantArticles = state.articles.filter(({ organizationId }) => organizationId === tenant);
  const tenantArticles = allTenantArticles.filter(({ createdAt }) => inRange(createdAt));
  const articleIds = new Set(tenantArticles.map(({ id }) => id));
  const tenantSites = state.sites.filter(({ organizationId }) => organizationId === tenant);
  const tenantAssignments = state.articleSites.filter(({ organizationId }) => organizationId === tenant);
  const activeAssignments = tenantAssignments.filter(({ active, articleId }) => active && articleIds.has(articleId));
  const outcomeAssignments = tenantAssignments.filter(({ stateOccurredAt }) => inRange(stateOccurredAt));
  const tenantJobs = state.publishingJobs.filter(({ organizationId, occurredAt }) => organizationId === tenant && inRange(occurredAt));
  const tenantJobIds = new Set(tenantJobs.map(({ id }) => id));
  const tenantTargets = state.publishingJobTargets.filter(({ organizationId, jobId }) => organizationId === tenant && tenantJobIds.has(jobId));
  const articleById = new Map(allTenantArticles.map((article) => [article.id, article]));
  const siteById = new Map(tenantSites.map((site) => [site.id, site]));
  const assignmentById = new Map(tenantAssignments.map((assignment) => [assignment.id, assignment]));
  const dimension = (articleId: string, siteId: string, value: string) => {
    const article = articleById.get(articleId); const site = siteById.get(siteId);
    const regionId = site?.regionId ?? article?.regionId;
    return article === undefined || site === undefined || regionId === undefined ? null : `${siteId}:${regionId}:${value}`;
  };
  const jobDimensions = tenantJobs.flatMap((job) => tenantTargets
    .filter(({ jobId }) => jobId === job.id)
    .flatMap((target) => {
      const assignment = assignmentById.get(target.articleSiteId);
      return assignment === undefined ? [] : dimension(job.articleId, assignment.siteId, job.state) ?? [];
    }));
  const outcomeDimensions = outcomeAssignments.flatMap((assignment) => dimension(assignment.articleId, assignment.siteId, assignment.state) ?? []);
  return Object.freeze({
    articlesByRegion: group(tenantArticles.map(({ regionId }) => regionId)),
    articlesBySite: group(activeAssignments.map(({ siteId }) => siteId)),
    articlesByCategory: group(tenantArticles.flatMap(({ categoryId }) => categoryId ?? [])),
    articlesByPublisher: group(tenantArticles.flatMap(({ publisherId }) => publisherId ?? [])),
    jobsByState: group(tenantJobs.map(({ state: value }) => value)),
    jobsBySiteRegionAndState: group(jobDimensions),
    outcomesBySiteAndState: group(outcomeAssignments.map(({ siteId, state: value }) => `${siteId}:${value}`)),
    outcomesBySiteRegionAndState: group(outcomeDimensions),
  });
}

export function filterAuditLogs(logs: readonly AuditRecord[], filter: AuditFilter): readonly AuditRecord[] {
  return logs.filter((log) => {
    if (filter.actorId !== undefined && log.actorId !== filter.actorId) return false;
    if (filter.action !== undefined && log.action !== filter.action) return false;
    if (filter.targetType !== undefined && log.targetType !== filter.targetType) return false;
    if (filter.outcome !== undefined && log.outcome !== filter.outcome) return false;
    if (filter.from !== undefined && log.occurredAt < filter.from) return false;
    return filter.to === undefined || log.occurredAt <= filter.to;
  });
}
