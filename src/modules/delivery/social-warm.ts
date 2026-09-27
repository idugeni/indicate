export type SocialWarmFailure =
  | 'page_http_status'
  | 'page_network'
  | 'image_not_linked'
  | 'image_http_status'
  | 'image_network'
  | 'facebook_unconfigured'
  | 'facebook_http_status'
  | 'facebook_network'
  | 'facebook_rate_limited';

export interface SocialWarmResult {
  readonly pageOk: boolean;
  readonly imageOk: boolean;
  readonly facebookOk: boolean;
  /** Closed-set cause per step; null while the step succeeded. */
  readonly pageReason: SocialWarmFailure | null;
  readonly imageReason: SocialWarmFailure | null;
  readonly facebookReason: SocialWarmFailure | null;
}

export interface SocialWarmResponse {
  readonly status: number;
  text(): Promise<string>;
}

export interface SocialWarmFetcher {
  (url: string, init: { readonly method: 'GET' | 'POST'; readonly headers?: Record<string, string>; readonly body?: string; readonly signal: AbortSignal }): Promise<SocialWarmResponse>;
}

const GRAPH_VERSION = 'v26.0';
const GRAPH_ENDPOINT = `https://graph.facebook.com/${GRAPH_VERSION}/`;
const FETCH_TIMEOUT_MS = 15_000;
const WARM_USER_AGENT = 'indicate-social-warm/1';
interface CacheWarm {
  readonly pageOk: boolean;
  readonly imageOk: boolean;
  readonly pageReason: SocialWarmFailure | null;
  readonly imageReason: SocialWarmFailure | null;
}

const PAGE_READ = { pageOk: true, pageReason: null } as const;
const IMAGE_WARMED = { imageOk: true, imageReason: null } as const;
const NO_OG_IMAGE = { imageOk: false, imageReason: 'image_not_linked' as const };
const NO_IMAGE_REASON = { imageOk: false, imageReason: 'image_http_status' as const };
const NO_FACEBOOK_REASON = { facebookOk: false, facebookReason: 'facebook_unconfigured' as const };
const PAGE_UNREACHABLE: CacheWarm = { pageOk: false, imageOk: false, pageReason: 'page_http_status', imageReason: 'image_not_linked' };
const PAGE_THREW: CacheWarm = { pageOk: false, imageOk: false, pageReason: 'page_network', imageReason: 'image_not_linked' };

function defaultFetcher(url: string, init: { readonly method: 'GET' | 'POST'; readonly headers?: Record<string, string>; readonly body?: string; readonly signal: AbortSignal }): Promise<SocialWarmResponse> {
  return fetch(url, init);
}

function extractOgImage(html: string): string | null {
  const propertyFirst = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/iu.exec(html);
  if (propertyFirst !== null) return propertyFirst[1] ?? null;
  const contentFirst = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/iu.exec(html);
  return contentFirst?.[1] ?? null;
}

/**
 * Classify a Meta scrape rejection that means the app-wide quota is spent.
 *
 * @param status - HTTP status of the scrape call.
 * @param body - Raw response body, empty when it could not be read.
 * @returns True when the caller must stop spending the remaining batch.
 * @remarks Quota exhaustion is not a per-URL failure: continuing would spend
 * every remaining call on URLs Meta is already refusing.
 */
export function isFacebookRateLimited(status: number, body: string): boolean {
  if (status === 429 || status >= 500) return true;
  if (status !== 403) return false;
  if (/"code"\s*:\s*4\b/u.test(body)) return true;
  return /request limit/iu.test(body);
}

/**
 * Warms one freshly published article for social scrapers.
 *
 * @param articleUrl - Canonical article URL to warm.
 * @returns Per-step outcomes and the closed-set cause of every failure; never throws.
 * @remarks The self-warm and the Meta pre-scrape are independent steps, and they
 * must stay that way. Warming our own edge cache for the page and its `og:image`
 * only helps the next reader, while the scrape hands the URL to Meta, which
 * fetches it from Meta's own network — the two share no dependency. Gating the
 * scrape on the self-warm disabled pre-scrape entirely in production: the
 * self-fetch never reached the origin, so `warmArticle` returned before the Graph
 * call and every published row stayed unwarmed. The scrape now always runs. A
 * rejection meaning the app-wide quota is spent reports
 * `facebook_rate_limited` so the caller abandons the rest of the batch rather
 * than spending it on URLs Meta is already refusing.
 */
export class SocialWarmer {
  constructor(
    private readonly facebookAppToken: string | null,
    private readonly fetchImpl: SocialWarmFetcher = defaultFetcher,
  ) {}

  async warmArticle(articleUrl: string): Promise<SocialWarmResult> {
    const { pageOk, imageOk, pageReason, imageReason } = await this.warmCaches(articleUrl);
    const { facebookOk, facebookReason } = await this.scrapeMeta(articleUrl);
    return { pageOk, imageOk, facebookOk, pageReason, imageReason, facebookReason };
  }

  private async warmCaches(articleUrl: string): Promise<CacheWarm> {    let pageHtml: string;
    try {
      const page = await this.fetchImpl(articleUrl, { method: 'GET', headers: { 'user-agent': WARM_USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (page.status < 200 || page.status >= 300) return PAGE_UNREACHABLE;
      try {
        pageHtml = await page.text();
      } catch {
        return { ...PAGE_READ, ...NO_OG_IMAGE };
      }
    } catch {
      return PAGE_THREW;
    }
    const imageSrc = extractOgImage(pageHtml);
    if (imageSrc === null) return { ...PAGE_READ, ...NO_OG_IMAGE };
    let imageUrl: string;
    try {
      imageUrl = new URL(imageSrc, articleUrl).toString();
    } catch {
      return { ...PAGE_READ, ...NO_OG_IMAGE };
    }
    try {
      const image = await this.fetchImpl(imageUrl, { method: 'GET', headers: { 'user-agent': WARM_USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      return { ...PAGE_READ, ...(image.status >= 200 && image.status < 300 ? IMAGE_WARMED : NO_IMAGE_REASON) };
    } catch {
      return { ...PAGE_READ, imageOk: false, imageReason: 'image_network' };
    }
  }

  private async scrapeMeta(articleUrl: string): Promise<{ readonly facebookOk: boolean; readonly facebookReason: SocialWarmFailure | null }> {
    if (this.facebookAppToken === null || this.facebookAppToken.length === 0) return NO_FACEBOOK_REASON;
    let status: number;
    let body: string;
    try {
      const scrape = await this.fetchImpl(GRAPH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'user-agent': WARM_USER_AGENT },
        body: new URLSearchParams({ id: articleUrl, scrape: 'true', access_token: this.facebookAppToken }).toString(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      status = scrape.status;
      try {
        body = await scrape.text();
      } catch {
        body = '';
      }
    } catch {
      return { facebookOk: false, facebookReason: 'facebook_network' };
    }
    if (status >= 200 && status < 300) return { facebookOk: true, facebookReason: null };
    return { facebookOk: false, facebookReason: isFacebookRateLimited(status, body) ? 'facebook_rate_limited' : 'facebook_http_status' };
  }
}
