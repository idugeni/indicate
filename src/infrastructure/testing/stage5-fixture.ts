import type { PublicArticle, PublicSiteData, ResolvedSiteContext } from '@/domain/stage5/models';
import { InMemoryStage5Repository } from './stage5-memory';

const ORG = '00000000-0000-4000-8000-000000000001';
const DOMAIN = '00000000-0000-4000-8000-000000000101';
const REGION = '00000000-0000-4000-8000-000000000102';
const ARTICLE_ID = '00000000-0000-4000-8000-000000000107';
const article: PublicArticle = { id: ARTICLE_ID, slug: 'kabar-wonosobo-hari-ini', title: 'Kabar Wonosobo Hari Ini', description: 'Informasi terbaru dari Wonosobo untuk pembaca lokal.', body: 'Wonosobo menghadirkan kabar lokal yang terverifikasi dan bermanfaat bagi masyarakat.', regionId: REGION, categoryId: '00000000-0000-4000-8000-000000000105', categorySlug: 'daerah', categoryName: 'Daerah', authorName: 'Redaksi Indicate', publisherName: 'Indicate Independent', attribution: 'Indicate Independent', publisherVerified: true, independent: true, officialInstitution: null, publishedAt: '2026-08-30T08:00:00.000Z', updatedAt: '2026-08-30T08:00:00.000Z', imageUrl: null, imageWidth: 1200, imageHeight: 675 };
function site(context: ResolvedSiteContext, name: string): PublicSiteData { return { context, settings: { name, description: `${name} menyajikan berita lokal terpercaya.`, colors: { primary: '#0b5d4b', accent: '#e9a23b' }, socialLinks: { instagram: 'https://example.com/indicate' }, navigation: [{ label: 'Beranda', path: '/' }, { label: 'Berita', path: '/articles' }, { label: 'Daerah', path: '/categories/daerah' }], logoUrl: null, faviconUrl: null, fallbackImageUrl: `https://${context.normalizedHostname}/assets/fallback.png`, robots: ['User-agent: *', 'Allow: /'] }, articles: [article] }; }
export function createStage5E2eRepository() { return new InMemoryStage5Repository([
  { data: site({ normalizedHostname: 'alpha.example.web.id', organizationId: ORG, domainId: DOMAIN, siteId: '00000000-0000-4000-8000-000000000103', regionId: null, routingVersion: 1, contentVersion: 1 }, 'Alpha News') },
  { data: site({ normalizedHostname: 'wonosobo.alpha.example.web.id', organizationId: ORG, domainId: DOMAIN, siteId: '00000000-0000-4000-8000-000000000108', regionId: REGION, routingVersion: 1, contentVersion: 1 }, 'Wonosobo Alpha') },
]); }
