import type { HostnameContext } from '@/core/operation-context';

export type PublicOutcome = 'site' | 'unknown' | 'ambiguous' | 'invalid';
export type ControlSurface = 'dashboard' | 'api' | 'webhook';

export interface ResolvedSiteContext extends HostnameContext {
  readonly contentVersion: number;
}

export interface ActiveSiteCandidate extends ResolvedSiteContext {
  readonly active: boolean;
}

export type RequestClassification =
  | { readonly kind: 'invalid'; readonly status: 400; readonly robots: 'noindex, nofollow' }
  | { readonly kind: 'control'; readonly hostname: string; readonly surface: ControlSurface }
  | { readonly kind: 'unknown'; readonly hostname: string; readonly status: 404; readonly robots: 'noindex, nofollow' }
  | { readonly kind: 'ambiguous'; readonly hostname: string; readonly status: 500; readonly robots: 'noindex, nofollow' }
  | { readonly kind: 'site'; readonly context: ResolvedSiteContext };

export interface PublicSiteSettings {
  readonly name: string;
  readonly description: string;
  readonly tagline: string | null;
  readonly seoDefaultTitle: string | null;
  readonly seoDefaultDescription: string | null;
  readonly seoSiteName: string | null;
  readonly locale: string | null;
  readonly colors: Readonly<Record<string, string>>;
  readonly socialLinks: Readonly<Record<string, string>>;
  readonly navigation: readonly { readonly label: string; readonly path: string }[];
  readonly logoUrl: string;
  readonly faviconUrl: string | null;
  readonly defaultImageUrl: string;
  readonly robots: readonly string[];
}

export interface ArticleListItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /** Optional editorial subheadline; falls back to description when null. */
  readonly dek?: string | null;
  /** Optional canonical URL override; falls back to the tenant article URL. */
  readonly canonicalUrl?: string | null;
  /** Optional per-article robots override (`noindex`, `nosnippet`); null follows site default. */
  readonly robotsDirective?: 'index, follow' | 'noindex, nofollow' | 'noindex, nofollow, nosnippet' | null;
  readonly tags: readonly string[];
  readonly regionId: string;  readonly categoryId: string | null;
  readonly categorySlug: string | null;
  readonly categoryName: string | null;
  readonly authorName: string | null;
  readonly authorDisplayName: string | null;
  readonly publisherName: string | null;
  readonly attribution: string;
  /** Publisher logo from `contacts.logoUrl`; null when not yet embedded (SEO uses the site logo). */
  readonly publisherLogoUrl: string | null;
  readonly publisherCity: string | null;
  /** Publisher bio: `contacts.bio` when filled, otherwise `DEFAULT_PUBLISHER_BIO`. */
  readonly publisherBio: string | null;
  /** Publisher-owned social links from `contacts`; no company-default fallback. */
  readonly publisherSocials: Readonly<Record<string, string>>;
  readonly authorBio: string | null;
  readonly authorAvatarUrl: string | null;
  readonly publisherVerified: boolean;
  readonly independent: boolean;
  readonly officialInstitution: string | null;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly articleSiteId: string;
  readonly viewCount: number;
  readonly imageUrl: string | null;
  readonly thumbnailUrl: string | null;
  /** Main image MIME type when from R2 media; null for external hotlinks. */
  readonly imageMediaType: string | null;
  readonly imageWidth: number | null;
  readonly imageHeight: number | null;
}

export interface NetworkArticle extends ArticleListItem {
  readonly body: string;
  /** Structured TipTap JSON; null for legacy plain-text articles. */
  readonly bodyJson?: unknown | null;
  /** Article-owned gallery (active image-type media, ordered by upload time); empty when none. */
  readonly gallery: readonly ArticleGalleryImage[];
}

/**
 * Guard a list item into a detail article: true when the row carries a full body + gallery.
 *
 * @param item - Article item from the list projection.
 * @returns True when the item is a full detail article.
 */
export function isNetworkArticle(item: ArticleListItem): item is NetworkArticle {
  return 'body' in item && typeof (item as { readonly body?: unknown }).body === 'string';
}

/** RSS feed row: metadata + full body without heavy relations. */
export interface FeedArticle {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly body: string;
  readonly imageUrl: string | null;
  readonly imageMediaType: string | null;
  readonly publishedAt: string;
  readonly categoryName: string | null;
}

export interface ArticleGalleryImage {
  readonly url: string;
  readonly thumbnailUrl: string | null;
}

/**
 * Default general PR bio for all publishers.
 *
 * @remarks
 * Used when a publisher's `contacts.bio` is empty; per-publisher overrides
 * remain possible via `contacts.bio`.
 */
export const DEFAULT_PUBLISHER_BIO =
  'Garda depan pelayanan informasi publik yang menyajikan kabar kegiatan, program kerja, capaian kinerja, dan pengumuman secara akurat, cepat, dan terverifikasi. Setiap materi disusun, ditelaah, dan disunting tim kehumasan sebelum diterbitkan sebagai wujud komitmen terhadap transparansi, akuntabilitas, dan kepercayaan masyarakat. Kritik, saran, serta kebutuhan klarifikasi dilayani melalui kanal kontak resmi yang tersedia.';

export interface NetworkSiteData {
  readonly context: ResolvedSiteContext;
  readonly regionName: string | null;
  readonly settings: PublicSiteSettings;
  readonly articles: readonly ArticleListItem[];
}

export interface NetworkContentQuery {
  readonly categorySlug?: string;
  readonly search?: string;
  readonly articleSlug?: string;
  readonly tag?: string;
}

export type ActivationOperation = 'activate' | 'deactivate';
export type ActivationState = 'pending' | 'cloudflare_verified' | 'vercel_associated' | 'probe_verified' | 'active' | 'deactivating' | 'completed' | 'failed';
export interface ActivationAttempt {
  readonly id: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly hostname: string;
  readonly previousHostname: string | null;
  readonly operation: ActivationOperation;
  readonly activationState: ActivationState;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly attempts: number;
  readonly nextAttemptAt: string;
  readonly claimToken: string | null;
  readonly claimExpiresAt: string | null;
  readonly externalStatus: Readonly<Record<string, unknown>>;
}

export interface CacheIdentity {
  readonly key: string;
  readonly embedded: Readonly<{ hostname: string; organizationId: string; siteId: string; routingVersion: number; contentVersion: number }>;
}

export interface InvalidationPlan {
  readonly organizationId: string;
  readonly siteId: string;
  readonly previousHostname: string | null;
  readonly currentHostname: string | null;
  readonly tags: readonly string[];
  readonly paths: readonly string[];
  readonly urls: readonly string[];
  readonly reason: string;
}

export interface InvalidationTask extends InvalidationPlan {
  readonly id: string;
  readonly attempts: number;
  readonly nextAttemptAt: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly claimToken: string | null;
  readonly claimExpiresAt: string | null;
  readonly sanitizedFailure: Readonly<Record<string, unknown>> | null;
}
