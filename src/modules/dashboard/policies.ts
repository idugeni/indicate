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

const DERET_MAKS_HARI = 90;
const WIB_MILIS = 7 * 3_600_000;

function kurangiHari(hari: string, jumlah: number): string {
  const tanggal = new Date(`${hari}T00:00:00Z`);
  tanggal.setUTCDate(tanggal.getUTCDate() - jumlah);
  return tanggal.toISOString().slice(0, 10);
}

function daftarHari(awal: string, akhir: string): string[] {
  const daftar: string[] = [];
  let hari = awal;
  while (hari <= akhir) {
    daftar.push(hari);
    const tanggal = new Date(`${hari}T00:00:00Z`);
    tanggal.setUTCDate(tanggal.getUTCDate() + 1);
    hari = tanggal.toISOString().slice(0, 10);
  }
  return daftar;
}

function dalamHari(iso: string, jendela: JendelaDeret): boolean {
  const hari = iso.slice(0, 10);
  return hari >= jendela.awal && hari <= jendela.akhir;
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
 * Bangun proyeksi analitik tenan dari state dalam memori.
 *
 * @param state - State tenan penuh (sudah terotorisasi).
 * @param filter - Rentang `from`/`to` ISO; membatasi marginal dan jendela deret.
 * @param hariAcuan - Hari acuan `YYYY-MM-DD` bila `filter.to` kosong; deret selalu 90 hari ke belakang.
 * @returns Proyeksi analitik beku.
 * @remarks Jendela deret: akhir = `filter.to` atau `hariAcuan`, awal = `filter.from` atau 89 hari sebelumnya, bentang dijepit maks 90 hari. Jam peta panas memakai Asia/Jakarta.
 */
export function buildAnalytics(
  state: DashboardTenantState,
  filter: { readonly from?: string | undefined; readonly to?: string | undefined } = {},
  hariAcuan: string,
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
  const judulOf = (articleId: string): string => articleById.get(articleId)?.title ?? articleId;

  const akhir = filter.to === undefined ? hariAcuan : filter.to.slice(0, 10);
  const awalBaku = filter.from === undefined ? kurangiHari(akhir, DERET_MAKS_HARI - 1) : filter.from.slice(0, 10);
  const awalJepit = kurangiHari(akhir, DERET_MAKS_HARI - 1) > awalBaku ? kurangiHari(akhir, DERET_MAKS_HARI - 1) : awalBaku;
  const jendela: JendelaDeret = awalJepit > akhir ? { awal: akhir, akhir } : { awal: awalJepit, akhir };

  const tugasHarian: TugasHarian[] = daftarHari(jendela.awal, jendela.akhir).map((hari) => {
    const harian = tenantJobs.filter(({ occurredAt }) => dalamHari(occurredAt, jendela) && occurredAt.slice(0, 10) === hari);
    return {
      hari,
      diterbitkan: harian.filter(({ state }) => state === 'published').length,
      gagal: harian.filter(({ state }) => state === 'failed').length,
      antre: harian.filter(({ state }) => state === 'queued' || state === 'processing' || state === 'retrying').length,
    };
  });

  const jamCounts = new Map<string, number>();
  for (const assignment of outcomeAssignments) {
    if (!dalamHari(assignment.stateOccurredAt, jendela)) continue;
    const wib = new Date(assignment.stateOccurredAt).getTime() + WIB_MILIS;
    const wibDate = new Date(wib);
    const hari = (wibDate.getUTCDay() + 6) % 7;
    const jam = wibDate.getUTCHours();
    const kunci = `${hari}:${jam}`;
    jamCounts.set(kunci, (jamCounts.get(kunci) ?? 0) + 1);
  }
  const aktivitasPerJam: AktivitasJam[] = [...jamCounts]
    .sort(([kiri], [kanan]) => (kiri < kanan ? -1 : 1))
    .map(([kunci, jumlah]) => {
      const [hari, jam] = kunci.split(':').map(Number);
      return { hari: hari ?? 0, jam: jam ?? 0, jumlah };
    });

  const peristiwa: AktivitasTerbaru[] = [
    ...tenantJobs.map((job) => ({ id: `job:${job.id}`, label: judulOf(job.articleId), status: job.state, at: job.occurredAt })),
    ...outcomeAssignments.map((assignment) => ({
      id: `hasil:${assignment.id}`,
      label: judulOf(assignment.articleId),
      status: assignment.state,
      at: assignment.stateOccurredAt,
    })),
    ...tenantArticles.map((article) => ({ id: `artikel:${article.id}`, label: article.title, status: article.status, at: article.createdAt })),
  ];
  const aktivitasTerbaru: AktivitasTerbaru[] = [...peristiwa]
    .sort((kiri, kanan) => (kiri.at < kanan.at ? 1 : kiri.at > kanan.at ? -1 : 0))
    .slice(0, 8);

  const arusCounts = new Map<string, number>();
  for (const assignment of outcomeAssignments) {
    const article = articleById.get(assignment.articleId);
    if (article?.publisherId === undefined || article.publisherId === null) continue;
    const kunci = JSON.stringify([article.publisherId, assignment.siteId, assignment.state]);
    arusCounts.set(kunci, (arusCounts.get(kunci) ?? 0) + 1);
  }
  const arusPenerbit: ArusPenerbit[] = [...arusCounts]
    .map(([kunci, jumlah]) => {
      const [penerbit, situs, hasil] = JSON.parse(kunci) as [string, string, string];
      return { penerbit, situs, hasil, jumlah };
    })
    .sort((kiri, kanan) => kanan.jumlah - kiri.jumlah);

  const penyaluranHarian: PenyaluranHarian[] = daftarHari(jendela.awal, jendela.akhir).map((hari) => {
    const harian = outcomeAssignments.filter(({ stateOccurredAt }) => dalamHari(stateOccurredAt, jendela) && stateOccurredAt.slice(0, 10) === hari);
    return {
      hari,
      diterbitkan: harian.filter(({ state }) => state === 'published').length,
      gagal: harian.filter(({ state }) => state === 'failed').length,
      antre: harian.filter(({ state }) => state === 'queued' || state === 'processing' || state === 'retrying' || state === 'unpublished').length,
    };
  });

  const viewsHarian: ViewsHarian[] = daftarHari(jendela.awal, jendela.akhir).map((hari) => {
    const harian = outcomeAssignments.filter(({ stateOccurredAt }) => dalamHari(stateOccurredAt, jendela) && stateOccurredAt.slice(0, 10) === hari);
    return {
      hari,
      penyaluran: harian.length,
      views: harian.reduce((jumlah, penyaluran) => jumlah + penyaluran.viewCount, 0),
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
    .sort((kiri, kanan) => kanan.views - kiri.views);
  const viewsByArticle: ViewsPoint[] = [...viewsPerArticle]
    .map(([key, slot]) => ({ key, count: slot.count, views: slot.views }))
    .sort((kiri, kanan) => kanan.views - kiri.views);

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
    jendela,
    tugasHarian,
    aktivitasPerJam,
    aktivitasTerbaru,
    arusPenerbit,
    penyaluranHarian,
    viewsHarian,
    viewsBySite,
    viewsByArticle,
    totalViews: outcomeAssignments.reduce((jumlah, penyaluran) => jumlah + penyaluran.viewCount, 0),
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
