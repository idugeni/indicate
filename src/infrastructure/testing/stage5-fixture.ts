import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import type { Stage7FixtureConfig } from '@/domain/stage7/models';
import type { PublicArticle, PublicContentQuery, PublicSiteData, ResolvedSiteContext } from '@/domain/stage5/models';
import type { Stage5Repository } from '@/ports/stage5-repository';
import type { InMemoryStage4Repository } from './stage4-memory';
import type { ReadinessRegionFixture, ReadinessRootFixture, ReadinessSiteFixture } from '@/domain/stage7/models';
import { InMemoryStage5Repository } from './stage5-memory';

const PUBLISHED_AT = '2026-08-30T08:00:00.000Z';

function rootLabel(hostname: string): string {
  const first = hostname.split('.')[0] ?? 'site';
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}`;
}

function article(root: ReadinessRootFixture, region: ReadinessRegionFixture): PublicArticle {
  const title = region.slug === 'wonosobo' ? 'Kabar Wonosobo Hari Ini' : `Kabar ${region.name} Hari Ini`;
  return Object.freeze({
    id: `${region.id.slice(0, -12)}${root.ordinal.toString().padStart(12, '0')}`,
    slug: `kabar-${region.slug}-hari-ini`,
    title,
    description: `Informasi terbaru dari ${region.name} untuk pembaca lokal.`,
    body: `${region.name} menghadirkan kabar lokal yang terverifikasi dan bermanfaat bagi masyarakat.`,
    regionId: region.id,
    categoryId: `${region.id.slice(0, -12)}000000000105`,
    categorySlug: 'daerah',
    categoryName: 'Daerah',
    authorName: 'Redaksi Indicate',
    publisherName: 'Indicate Independent',
    attribution: 'Indicate Independent',
    publisherVerified: true,
    independent: true,
    officialInstitution: null,
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    imageUrl: null,
    imageWidth: 1200,
    imageHeight: 675,
  });
}

function context(site: ReadinessSiteFixture): ResolvedSiteContext {
  return Object.freeze({
    normalizedHostname: site.normalizedHostname,
    organizationId: site.organizationId,
    domainId: site.domainId,
    siteId: site.id,
    regionId: site.regionId,
    routingVersion: 1,
    contentVersion: 1,
  });
}

function siteData(root: ReadinessRootFixture, site: ReadinessSiteFixture, name: string, articles: readonly PublicArticle[]): PublicSiteData {
  const resolved = context(site);
  return Object.freeze({
    context: resolved,
    settings: Object.freeze({
      name,
      description: `${name} menyajikan berita lokal terpercaya.`,
      colors: Object.freeze({ primary: '#0b5d4b', accent: '#e9a23b' }),
      socialLinks: Object.freeze({ instagram: 'https://example.com/indicate' }),
      navigation: Object.freeze([
        Object.freeze({ label: 'Beranda', path: '/' }),
        Object.freeze({ label: 'Berita', path: '/articles' }),
        Object.freeze({ label: 'Daerah', path: '/categories/daerah' }),
      ]),
      logoUrl: null,
      faviconUrl: null,
      fallbackImageUrl: `https://${resolved.normalizedHostname}/assets/fallback.png`,
      robots: Object.freeze(['User-agent: *', 'Allow: /']),
    }),
    articles: Object.freeze([...articles]),
  });
}

export function createStage5E2eRepository(config: Stage7FixtureConfig): InMemoryStage5Repository {
  const fixture = createStage7ReadinessFixture(config);
  const sites = fixture.roots.flatMap((root) => {
    const label = rootLabel(root.normalizedHostname);
    const articles = root.regions.map((region) => article(root, region));
    return [
      { data: siteData(root, root.apexSite, `${label} News`, articles) },
      ...root.regionalSites.map((site, index) => ({
        data: siteData(root, site, `${root.regions[index]?.name ?? 'Regional'} ${label}`, [articles[index]!]),
      })),
    ];
  });
  return new InMemoryStage5Repository(sites);
}



/**
 * Faithful deterministic Stage 7 public adapter. Publication and public reads
 * share the same Stage 4 source of truth; no public Article is preseeded.
 */
export class Stage7SharedJourneyRepository implements Pick<Stage5Repository, 'findActiveSitesByExactHostname' | 'loadPublicSite' | 'isCacheBypassed'> {
  private readonly fixture: ReturnType<typeof createStage7ReadinessFixture>;

  constructor(config: Stage7FixtureConfig, private readonly source: InMemoryStage4Repository) {
    this.fixture = createStage7ReadinessFixture(config);
  }

  async findActiveSitesByExactHostname(hostname: string): Promise<readonly ResolvedSiteContext[]> {
    const site = this.fixture.allSites.find(({ normalizedHostname }) => normalizedHostname === hostname);
    if (site === undefined) return [];
    const snapshot = await this.source.snapshot(site.organizationId);
    if (snapshot === null || !snapshot.sites.some(({ id, active }) => id === site.id && active)) return [];
    return [context(site)];
  }

  async isCacheBypassed(): Promise<boolean> { return false; }

  async loadPublicSite(siteContext: ResolvedSiteContext, query: PublicContentQuery): Promise<PublicSiteData | null> {
    const fixtureSite = this.fixture.allSites.find(({ id }) => id === siteContext.siteId);
    if (fixtureSite === undefined
      || fixtureSite.organizationId !== siteContext.organizationId
      || fixtureSite.normalizedHostname !== siteContext.normalizedHostname) return null;
    const root = this.fixture.roots.find(({ organizationId }) => organizationId === fixtureSite.organizationId);
    const snapshot = await this.source.snapshot(siteContext.organizationId);
    if (root === undefined || snapshot === null || !snapshot.sites.some(({ id, active }) => id === fixtureSite.id && active)) return null;

    const publishedArticleIds = new Set(snapshot.articleSites
      .filter(({ siteId, state, active }) => siteId === fixtureSite.id && state === 'published' && active)
      .map(({ articleId }) => articleId));
    const region = fixtureSite.regionId === null ? null : root.regions.find(({ id }) => id === fixtureSite.regionId) ?? null;
    const articles = snapshot.articles
      .filter(({ id, active }) => active && publishedArticleIds.has(id))
      .map((record): PublicArticle => {
        const selectedRegion = region ?? root.regions.find((candidate) => record.id.startsWith(candidate.id.slice(0, -12))) ?? root.regions[0]!;
        return Object.freeze({
          ...article(root, selectedRegion),
          id: record.id,
          slug: `stage7-${selectedRegion.slug}`,
          title: `Stage 7 ${selectedRegion.name}`,
          body: 'Production readiness matrix article.',
          regionId: selectedRegion.id,
          imageUrl: null,
        });
      })
      .filter((record) => query.articleSlug === undefined || record.slug === query.articleSlug)
      .filter((record) => query.categorySlug === undefined || record.categorySlug === query.categorySlug)
      .filter((record) => query.search === undefined || `${record.title} ${record.body}`.toLocaleLowerCase('id-ID').includes(query.search.toLocaleLowerCase('id-ID')));
    const label = rootLabel(root.normalizedHostname);
    const name = region === null ? `${label} News` : `${region.name} ${label}`;
    return siteData(root, fixtureSite, name, articles);
  }
}

export function createStage7SharedJourneyRepository(config: Stage7FixtureConfig, source: InMemoryStage4Repository): Stage7SharedJourneyRepository {
  return new Stage7SharedJourneyRepository(config, source);
}
