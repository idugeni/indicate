import 'server-only';

import { logEvent } from '@/core/observability/logger';
import type { PublicationPingPort } from '@/modules/publishing/ports';

const PINGOMATIC_ENDPOINT = 'https://rpc.pingomatic.com/';
const PING_TIMEOUT_MS = 10_000;
const PING_MAX_HOSTS = 20;

function xml(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
}

/**
 * Pings Ping-O-Matic about freshly published hosts over XML-RPC.
 *
 * @remarks Best-effort discovery nudge alongside sitemap and IndexNow: one
 * `weblogUpdates.ping` per hostname carrying the blog name and home page.
 * Failures stay silent telemetry because aggregators still poll the feeds.
 */
export class HttpPingomaticPinger implements PublicationPingPort {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly endpoint: string = PINGOMATIC_ENDPOINT,
    private readonly timeoutMs: number = PING_TIMEOUT_MS,
  ) {}

  async ping(urls: readonly string[]): Promise<void> {
    const hosts = [...new Set(urls.filter((url) => url.startsWith('https://')).map((url) => new URL(url).hostname))].slice(0, PING_MAX_HOSTS);
    if (hosts.length === 0) return;
    try {
      const outcomes = await Promise.allSettled(hosts.map((host) => this.pingHost(host)));
      const pinged = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
      logEvent('info', { event: 'publishing.pingomatic', context: { hosts: hosts.length, pinged } });
    } catch {
      /* best-effort: aggregators still poll feeds */
    }
  }

  private async pingHost(host: string): Promise<void> {
    const body = `<?xml version="1.0"?><methodCall><methodName>weblogUpdates.ping</methodName><params><param><value><string>${xml(host)}</string></value></param><param><value><string>${xml(`https://${host}/`)}</string></value></param></params></methodCall>`;
    const response = await this.fetchFn(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8' },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`pingomatic HTTP ${response.status}`);
  }
}
