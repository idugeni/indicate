import type {
  AktivitasJam,
  AktivitasTerbaru,
  AnalyticsPoint,
  AnalyticsProjection,
  ArusPenerbit,
  ArticleFilter,
  ArticleRecord,
  AuditFilter,
  AuditRecord,
  DashboardProjection,
  JendelaDeret,
  OfficialAffiliationRecord,
  NetworkPublisherClaim,
  PenyaluranHarian,
  PublisherRecord,
  DashboardTenantState,
  TugasHarian,
  ViewsHarian,
  ViewsPoint,
} from '@/modules/dashboard/models';

function group(values: readonly string[]): readonly AnalyticsPoint[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => ({ key, count }));
}

const MAX_SERIES_DAYS = 90;
const WIB_MILIS = 7 * 3_600_000;

function subtractDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
}

function listDays(start: string, end: string): string[] {
  const days: string[] = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    day = date.toISOString().slice(0, 10);
  }
  return days;
}

function isInWindow(iso: string, window: JendelaDeret): boolean {
  const day = iso.slice(0, 10);
  return day >= window.awal && day <= window.akhir;
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
    if (site.regionId !== null && state.regions.find((candidate) => candidate.organizationId === state.organizationId && candidate.id === site.regionId && candidate.status === 'active') === undefined) return false;
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
  const domainHostById = new Map(
    state.domains.filter(({ organizationId }) => organizationId === tenant).map(({ id, normalizedHostname }) => [id, normalizedHostname] as const),
  );
  return Object.freeze({
    activeDomains: state.domains.filter(({ organizationId, status }) => organizationId === tenant && status === 'active').length,
    activeSubdomains: state.sites.filter(({ organizationId, status, domainId, normalizedHostname }) =>
      organizationId === tenant && status === 'active' && domainHostById.get(domainId) !== normalizedHostname).length,
    activeSites: state.sites.filter(({ organizationId, status }) => organizationId === tenant && status === 'active').length,
    activeArticles: state.articles.filter(({ organizationId, status }) => organizationId === tenant && status === 'active').length,
    archivedArticles: state.articles.filter(({ organizationId, status }) => organizationId === tenant && status === 'archived').length,
    jobsByState: Object.fromEntries(states.map((jobState) => [jobState, state.publishingJobs.filter(({ organizationId, state: value }) => organizationId === tenant && value === jobState).length])) as DashboardProjection['jobsByState'],
    successfulSiteOutcomes: state.articleSites.filter(({ organizationId, state: value }) => organizationId === tenant && value === 'published').length,
    failedSiteOutcomes: state.articleSites.filter(({ organizationId, state: value }) => organizationId === tenant && value === 'failed').length,
    activeMedia: state.media.filter(({ organizationId, state: value }) => organizationId === tenant && value === 'active').length,
    regionScope: null,
  });
}

/**
 * Build the tenant analytics projection from in-memory state.
 *
 * @param state - Full tenant state (already authorized).
 * @param filter - ISO `from`/`to` range; bounds the marginals and the series window.
 * @param referenceDay - Reference `YYYY-MM-DD` day when `filter.to` is empty; the series always spans 90 days back.
 * @returns Frozen analytics projection.
 * @remarks Series window: end = `filter.to` or `referenceDay`, start = `filter.from` or 89 days earlier, span clamped to max 90 days. The heat-map hours use Asia/Jakarta.
 */
export function buildAnalytics(
  state: DashboardTenantState,
  filter: { readonly from?: string | undefined; readonly to?: string | undefined } = {},
  referenceDay: string,
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
  const titleOf = (articleId: string): string => articleById.get(articleId)?.title ?? articleId;

  const end = filter.to === undefined ? referenceDay : filter.to.slice(0, 10);
  const defaultStart = filter.from === undefined ? subtractDays(end, MAX_SERIES_DAYS - 1) : filter.from.slice(0, 10);
  const clampedStart = subtractDays(end, MAX_SERIES_DAYS - 1) > defaultStart ? subtractDays(end, MAX_SERIES_DAYS - 1) : defaultStart;
  const window: JendelaDeret = clampedStart > end ? { awal: end, akhir: end } : { awal: clampedStart, akhir: end };

  const tugasHarian: TugasHarian[] = listDays(window.awal, window.akhir).map((day) => {
    const daily = tenantJobs.filter(({ occurredAt }) => isInWindow(occurredAt, window) && occurredAt.slice(0, 10) === day);
    return {
      hari: day,
      diterbitkan: daily.filter(({ state }) => state === 'published').length,
      gagal: daily.filter(({ state }) => state === 'failed').length,
      antre: daily.filter(({ state }) => state === 'queued' || state === 'processing' || state === 'retrying').length,
    };
  });

  const hourCounts = new Map<string, number>();
  for (const assignment of outcomeAssignments) {
    if (!isInWindow(assignment.stateOccurredAt, window)) continue;
    const wib = new Date(assignment.stateOccurredAt).getTime() + WIB_MILIS;
    const wibDate = new Date(wib);
    const day = (wibDate.getUTCDay() + 6) % 7;
    const hour = wibDate.getUTCHours();
    const key = `${day}:${hour}`;
    hourCounts.set(key, (hourCounts.get(key) ?? 0) + 1);
  }
  const aktivitasPerJam: AktivitasJam[] = [...hourCounts]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([key, count]) => {
      const [day, hour] = key.split(':').map(Number);
      return { hari: day ?? 0, jam: hour ?? 0, jumlah: count };
    });

  const events: AktivitasTerbaru[] = [
    ...tenantJobs.map((job) => ({ id: `job:${job.id}`, label: titleOf(job.articleId), status: job.state, at: job.occurredAt })),
    ...outcomeAssignments.map((assignment) => ({
      id: `hasil:${assignment.id}`,
      label: titleOf(assignment.articleId),
      status: assignment.state,
      at: assignment.stateOccurredAt,
    })),
    ...tenantArticles.map((article) => ({ id: `artikel:${article.id}`, label: article.title, status: article.status, at: article.createdAt })),
  ];
  const aktivitasTerbaru: AktivitasTerbaru[] = [...events]
    .sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0))
    .slice(0, 8);

  const flowCounts = new Map<string, number>();
  for (const assignment of outcomeAssignments) {
    const article = articleById.get(assignment.articleId);
    if (article?.publisherId === undefined || article.publisherId === null) continue;
    const key = JSON.stringify([article.publisherId, assignment.siteId, assignment.state]);
    flowCounts.set(key, (flowCounts.get(key) ?? 0) + 1);
  }
  const arusPenerbit: ArusPenerbit[] = [...flowCounts]
    .map(([key, count]) => {
      const [publisher, site, outcome] = JSON.parse(key) as [string, string, string];
      return { penerbit: publisher, situs: site, hasil: outcome, jumlah: count };
    })
    .sort((left, right) => right.jumlah - left.jumlah);

  const penyaluranHarian: PenyaluranHarian[] = listDays(window.awal, window.akhir).map((day) => {
    const daily = outcomeAssignments.filter(({ stateOccurredAt }) => isInWindow(stateOccurredAt, window) && stateOccurredAt.slice(0, 10) === day);
    return {
      hari: day,
      diterbitkan: daily.filter(({ state }) => state === 'published').length,
      gagal: daily.filter(({ state }) => state === 'failed').length,
      antre: daily.filter(({ state }) => state === 'queued' || state === 'processing' || state === 'retrying' || state === 'unpublished').length,
    };
  });

  const viewsHarian: ViewsHarian[] = listDays(window.awal, window.akhir).map((day) => {
    const daily = outcomeAssignments.filter(({ stateOccurredAt }) => isInWindow(stateOccurredAt, window) && stateOccurredAt.slice(0, 10) === day);
    return {
      hari: day,
      penyaluran: daily.length,
      views: daily.reduce((total, delivery) => total + delivery.viewCount, 0),
    };
  });

  const viewsPerSite = new Map<string, { count: number; views: number }>();
  const viewsPerArticle = new Map<string, { count: number; views: number }>();
  for (const assignment of outcomeAssignments) {
    const site = viewsPerSite.get(assignment.siteId) ?? { count: 0, views: 0 };
    site.count += 1;
    site.views += assignment.viewCount;
    viewsPerSite.set(assignment.siteId, site);
    const article = viewsPerArticle.get(assignment.articleId) ?? { count: 0, views: 0 };
    article.count += 1;
    article.views += assignment.viewCount;
    viewsPerArticle.set(assignment.articleId, article);
  }
  const viewsBySite: ViewsPoint[] = [...viewsPerSite]
    .map(([key, slot]) => ({ key, count: slot.count, views: slot.views }))
    .sort((left, right) => right.views - left.views);
  const viewsByArticle: ViewsPoint[] = [...viewsPerArticle]
    .map(([key, slot]) => ({ key, count: slot.count, views: slot.views }))
    .sort((left, right) => right.views - left.views);

  const siteLabels: Record<string, string> = {};
  for (const site of tenantSites) siteLabels[site.id] = site.normalizedHostname;
  const categoryLabels: Record<string, string> = {};
  for (const category of state.categories.filter(({ organizationId }) => organizationId === tenant)) categoryLabels[category.id] = category.name;
  const publisherLabels: Record<string, string> = {};
  for (const publisher of state.publishers.filter(({ organizationId }) => organizationId === tenant)) publisherLabels[publisher.id] = publisher.name;
  const regionLabels: Record<string, string> = {};
  for (const region of state.regions.filter(({ organizationId }) => organizationId === tenant)) regionLabels[region.id] = region.name;
  const articleLabels: Record<string, string> = {};
  for (const article of allTenantArticles) articleLabels[article.id] = article.title;

  return Object.freeze({
    articlesByRegion: group(tenantArticles.map(({ regionId }) => regionId)),
    articlesBySite: group(activeAssignments.map(({ siteId }) => siteId)),
    articlesByCategory: group(tenantArticles.flatMap(({ categoryId }) => categoryId ?? [])),
    articlesByPublisher: group(tenantArticles.flatMap(({ publisherId }) => publisherId ?? [])),
    articlesByStatus: group(tenantArticles.map(({ status }) => status)),
    jobsByState: group(tenantJobs.map(({ state: value }) => value)),
    jobsBySiteRegionAndState: group(jobDimensions),
    outcomesBySiteAndState: group(outcomeAssignments.map(({ siteId, state: value }) => `${siteId}:${value}`)),
    outcomesBySiteRegionAndState: group(outcomeDimensions),
    jendela: window,
    tugasHarian,
    aktivitasPerJam,
    aktivitasTerbaru,
    arusPenerbit,
    penyaluranHarian,
    viewsHarian,
    viewsBySite,
    viewsByArticle,
    totalViews: outcomeAssignments.reduce((total, delivery) => total + delivery.viewCount, 0),
    totalPenyaluran: outcomeAssignments.length,
    siteLabels,
    categoryLabels,
    publisherLabels,
    regionLabels,
    articleLabels,
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
