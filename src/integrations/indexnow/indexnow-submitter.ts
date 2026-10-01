import 'server-only';

import { logEvent } from '@/core/observability/logger';
import type { PublicationIndexNowPort } from '@/modules/publishing/ports';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SUBMIT_TIMEOUT_MS = 10_000;
const SUBMIT_MAX_URLS = 100;

/**
 * Submits freshly published URLs to IndexNow-enabled search engines.
 *
 * @remarks Best-effort fan-out over the shared global endpoint: one POST
 * reaches every participant. Failures stay silent telemetry because sitemap
 * and recrawl still converge without it.
 */
export class HttpIndexNowSubmitter implements PublicationIndexNowPort {
  constructor(
    private readonly key: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly endpoint: string = INDEXNOW_ENDPOINT,
    private readonly timeoutMs: number = SUBMIT_TIMEOUT_MS,
  ) {}

  async submit(urls: readonly string[]): Promise<void> {
    const targets = [...new Set(urls)].filter((url) => url.startsWith('https://')).slice(0, SUBMIT_MAX_URLS);
    if (targets.length === 0 || this.key.length === 0) return;
    const hosts = [...new Set(targets.map((url) => new URL(url).hostname))];
    try {
      const outcomes = await Promise.allSettled(hosts.map((host) => this.submitHost(host, targets.filter((url) => new URL(url).hostname === host))));
      const submitted = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
      logEvent('info', { event: 'publishing.indexnow', context: { requested: targets.length, hosts: hosts.length, submitted } });
    } catch {
      /* best-effort: sitemap still converges */
    }
  }

  private async submitHost(host: string, urlList: readonly string[]): Promise<void> {
    const response = await this.fetchFn(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: this.key, urlList }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    await response.arrayBuffer();
    if (!response.ok && response.status !== 202) throw new Error(`indexnow HTTP ${response.status}`);
  }
}
