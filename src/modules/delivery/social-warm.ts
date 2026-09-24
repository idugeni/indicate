export interface SocialWarmResult {
  readonly pageOk: boolean;
  readonly imageOk: boolean;
  readonly facebookOk: boolean;
}

export interface SocialWarmResponse {
  readonly status: number;
  text(): Promise<string>;
}

export interface SocialWarmFetcher {
  (url: string, init: { readonly method: 'GET' | 'POST'; readonly headers?: Record<string, string>; readonly body?: string; readonly signal: AbortSignal }): Promise<SocialWarmResponse>;
}

const GRAPH_VERSION = 'v26.0';
const FETCH_TIMEOUT_MS = 15_000;

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
 * Warm one freshly published article for social scrapers.
 *
 * @param articleUrl - Canonical article URL to warm.
 * @returns Page, image, and Facebook pre-scrape flags; never throws.
 * @remarks Best-effort by design: every step fails into its own false flag
 * and the method never throws, so warming can never fail an invalidation
 * task. Self-warm (page + image GET) heats edge and render caches for every
 * scraper; the Facebook scrape call additionally asks Meta to process the
 * URL up front and only runs when an app token is set.
 */
export class SocialWarmer {
  constructor(
    private readonly facebookAppToken: string | null,
    private readonly fetchImpl: SocialWarmFetcher = defaultFetcher,
  ) {}

  async warmArticle(articleUrl: string): Promise<SocialWarmResult> {
    const failed: SocialWarmResult = { pageOk: false, imageOk: false, facebookOk: false };
    let pageHtml: string;
    try {
      const page = await this.fetchImpl(articleUrl, { method: 'GET', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (page.status < 200 || page.status >= 300) return failed;
      try {
        pageHtml = await page.text();
      } catch {
        return { ...failed, pageOk: true };
      }
    } catch {
      return failed;
    }
    const imageSrc = extractOgImage(pageHtml);
    if (imageSrc === null) return { ...failed, pageOk: true };
    let imageUrl: string;
    try {
      imageUrl = new URL(imageSrc, articleUrl).toString();
    } catch {
      return { ...failed, pageOk: true };
    }
    let imageOk = false;
    try {
      const image = await this.fetchImpl(imageUrl, { method: 'GET', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      imageOk = image.status >= 200 && image.status < 300;
    } catch {
      imageOk = false;
    }
    if (this.facebookAppToken === null || this.facebookAppToken.length === 0) return { pageOk: true, imageOk, facebookOk: false };
    try {
      const scrape = await this.fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: articleUrl, scrape: 'true', access_token: this.facebookAppToken }).toString(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      return { pageOk: true, imageOk, facebookOk: scrape.status >= 200 && scrape.status < 300 };
    } catch {
      return { pageOk: true, imageOk, facebookOk: false };
    }
  }
}
