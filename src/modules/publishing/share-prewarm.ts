import { logEvent } from '@/core/observability/logger';

import type { PublicationSharePrewarmPort } from '@/modules/publishing/ports';

const PREWARM_TIMEOUT_MS = 10_000;
const PREWARM_MAX_URLS = 50;
const PREWARM_USER_AGENT = 'indicate-prewarm/1';

/**
 * Warms published URLs with bounded plain fetches.
 *
 * @remarks Reads the full body so edge caches and origins finish rendering;
 * warm failures stay silent telemetry because crawlers still get correct
 * responses on a miss, only slower.
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
    logEvent('info', { event: 'publishing.prewarm', context: { requested: targets.length, warmed } });
  }

  private async warmOne(url: string): Promise<void> {
    const response = await this.fetchFn(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { 'user-agent': PREWARM_USER_AGENT },
    });
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`prewarm HTTP ${response.status}`);
  }
}
