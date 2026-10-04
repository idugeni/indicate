import { logEvent } from '@/core/observability/logger';

import type { PublicationSharePrewarmPort } from '@/modules/publishing/ports';
import { extractSocialImage, hasRequiredSocialTags } from '@/modules/publishing/share-readiness';

const PREWARM_TIMEOUT_MS = 10_000;
const PREWARM_MAX_URLS = 50;
const PREWARM_USER_AGENT = 'indicate-prewarm/1';
const PREWARM_MAX_ATTEMPTS = 3;

/**
 * Warms published URLs including their social images, with validation.
 *
 * @remarks A plain 200 is not enough: WhatsApp caches the first scrape per
 * exact URL, so an HTML without `og:image` warms the wrong thing. Each URL is
 * retried briefly, then its `og:image` bytes are fetched to warm the media CDN
 * too. Warm failures stay telemetry-only because crawlers still get correct
 * (if slower) responses on a miss.
 */
export class HttpSharePrewarm implements PublicationSharePrewarmPort {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs: number = PREWARM_TIMEOUT_MS,
  ) {}

  async prewarm(urls: readonly string[]): Promise<void> {
    const targets = [...new Set(urls)].filter((url) => url.startsWith('https://')).slice(0, PREWARM_MAX_URLS);
    if (targets.length === 0) return;
    const outcomes = await Promise.allSettled(targets.map((url) => this.warmOne(url)));
    const warmed = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
    logEvent('info', { event: 'publishing.prewarm', context: { requested: targets.length, warmed, failed: targets.length - warmed } });
  }

  private async warmOne(url: string): Promise<void> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= PREWARM_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.fetchFn(url, {
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: { 'user-agent': PREWARM_USER_AGENT, accept: 'text/html' },
        });
        const contentType = response.headers.get('content-type') ?? '';
        const html = await response.text();
        if (!response.ok || !contentType.includes('text/html') || !hasRequiredSocialTags(html)) {
          throw new Error(`prewarm HTML invalid HTTP ${response.status}`);
        }
        const imageUrl = extractSocialImage(html);
        if (imageUrl !== null) await this.warmImage(imageUrl);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('prewarm failed');
  }

  private async warmImage(imageUrl: string): Promise<void> {
    if (!imageUrl.startsWith('https://')) return;
    const response = await this.fetchFn(imageUrl, {
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { 'user-agent': PREWARM_USER_AGENT, accept: 'image/*' },
    });
    await response.arrayBuffer();
    if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith('image/')) {
      throw new Error(`prewarm image invalid HTTP ${response.status}`);
    }
  }
}
