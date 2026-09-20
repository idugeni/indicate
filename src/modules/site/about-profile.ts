import type { NetworkSiteData } from '@/modules/delivery/models';

export interface AboutCategory {
  readonly slug: string;
  readonly name: string;
}

/**
 * Derives the site's active coverage channels in first-seen order.
 *
 * @param site - Tenant site with its published articles.
 * @returns Unique categories; empty when nothing is published yet.
 */
export function deriveAboutCategories(site: NetworkSiteData): readonly AboutCategory[] {
  const seen = new Map<string, string>();
  for (const article of site.articles) {
    if (article.categorySlug !== null && article.categoryName !== null && !seen.has(article.categorySlug)) {
      seen.set(article.categorySlug, article.categoryName);
    }
  }
  return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
}

export interface AboutPublisher {
  readonly name: string;
  readonly bio: string | null;
  readonly city: string | null;
  readonly logoUrl: string | null;
  readonly verified: boolean;
  readonly socials: Readonly<Record<string, string>>;
  readonly articleCount: number;
}

/**
 * Resolves the site's dominant publisher by published article count.
 *
 * @param site - Tenant site with its published articles.
 * @returns Merged identity of the most-published publisher, or null when no article names one.
 */
export function deriveAboutPublisher(site: NetworkSiteData): AboutPublisher | null {
  const counts = new Map<string, number>();
  for (const article of site.articles) {
    if (article.publisherName === null) continue;
    counts.set(article.publisherName, (counts.get(article.publisherName) ?? 0) + 1);
  }
  let dominant: string | null = null;
  let best = 0;
  for (const [name, count] of counts) {
    if (count > best) {
      best = count;
      dominant = name;
    }
  }
  if (dominant === null) return null;
  const rows = site.articles.filter((article) => article.publisherName === dominant);
  const representative = rows.find((article) => article.publisherBio !== null) ?? rows[0];
  const socials: Record<string, string> = {};
  for (const row of rows) Object.assign(socials, row.publisherSocials);
  return {
    name: dominant,
    bio: representative?.publisherBio ?? null,
    city: representative?.publisherCity ?? null,
    logoUrl: representative?.publisherLogoUrl ?? null,
    verified: rows.some((article) => article.publisherVerified),
    socials,
    articleCount: rows.length,
  };
}

export interface AboutTrustLink {
  readonly label: string;
  readonly href: string;
}

/**
 * Trust-hub destinations every tenant About page links to.
 */
export const ABOUT_TRUST_LINKS: readonly AboutTrustLink[] = [
  { label: 'Kontak redaksi', href: '/kontak' },
  { label: 'Kebijakan privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat & ketentuan', href: '/syarat-ketentuan' },
  { label: 'Laporkan konten', href: '/report' },
];

/**
 * Builds a region-aware About page title.
 *
 * @param siteName - Tenant portal name.
 * @param regionName - Coverage region; null for the apex site.
 * @returns Title unique per regional site.
 */
export function aboutTitle(siteName: string, regionName: string | null): string {
  return regionName === null ? `Tentang ${siteName}` : `Tentang ${siteName} — ${regionName}`;
}

/**
 * Builds a region-aware About page description.
 *
 * @param siteName - Tenant portal name for the empty-description fallback.
 * @param base - Site SEO description, if configured.
 * @param regionName - Coverage region; null for the apex site.
 * @returns Description unique per regional site.
 */
export function aboutDescription(
  siteName: string,
  base: string | undefined,
  regionName: string | null,
): string {
  const trimmed = (base ?? '').trim();
  const core = trimmed === '' ? `Profil ${siteName}: penerbit, kanal liputan, dan kebijakan redaksi.` : trimmed;
  return regionName === null ? core : `${core} Melayani wilayah ${regionName}.`;
}
