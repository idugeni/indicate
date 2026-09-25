/**
 * Fleet-wide Facebook pre-sweep: hands tenant homepages to Meta's Sharing
 * Debugger backend so a link shared on Facebook renders a card immediately
 * instead of waiting for the crawler.
 *
 * The single-URL warm in `SocialWarmer` fires on publish. This covers the whole
 * tenant fleet on a schedule, which matters because Meta caches each URL for
 * about 30 days and only re-scrapes on request.
 *
 * Budget, not correctness, is the binding constraint here. `scrape=true` makes
 * Meta's crawler fetch the page *and* the `og:image`, so one call spends
 * several units of an app-wide quota that rejects with HTTP 403 and Graph error
 * code 4 ("Application request limit reached"). A rejection is therefore not a
 * per-URL failure to retry: the whole run stops and leaves the cursor for the
 * next window.
 */

const GRAPH_ENDPOINT = 'https://graph.facebook.com/';
const FETCH_TIMEOUT_MS = 20_000;

export interface SocialSweepResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export interface SocialSweepFetcher {
  (url: string, init: { readonly method: 'POST'; readonly headers: Record<string, string>; readonly body: string; readonly signal: AbortSignal }): Promise<SocialSweepResponse>;
}

export interface SocialSweepHost {
  readonly hostname: string;
  /** True for an apex portal; apex URLs are shared far more often than region or city ones. */
  readonly apex: boolean;
}

export type SocialSweepOutcome = 'verified' | 'unreachable' | 'rejected' | 'failed';

export interface SocialSweepResult {
  readonly hostname: string;
  readonly url: string;
  readonly outcome: SocialSweepOutcome;
  /** True when Meta's parser returned no title, description, image, or site name. */
  readonly incomplete: boolean;
  readonly appUsage: string | null;
  readonly detail: string | null;
}

export interface SocialSweepReport {
  readonly attempted: number;
  readonly verified: number;
  readonly incomplete: number;
  readonly unreachable: number;
  readonly rejected: number;
  readonly failed: number;
  /** True when Meta's app request limit stopped the run. */
  readonly halted: boolean;
  readonly nextOffset: number;
  readonly results: readonly SocialSweepResult[];
}

export interface SocialSweepOptions {
  /** Page URLs to hand to Meta this run. */
  readonly hosts: readonly SocialSweepHost[];
  /** Index into a stably ordered host list; the caller persists it. */
  readonly offset: number;
  /** Hard cap on calls per run, so one window can never exhaust the quota alone. */
  readonly limit: number;
  readonly appToken: string;
  readonly fetchImpl?: SocialSweepFetcher;
}

interface MetaScrapeBody {
  readonly title?: unknown;
  readonly description?: unknown;
  readonly image?: unknown;
  readonly site_name?: unknown;
  readonly error?: { readonly code?: unknown; readonly message?: unknown };
}

function defaultFetcher(url: string, init: { readonly method: 'POST'; readonly headers: Record<string, string>; readonly body: string; readonly signal: AbortSignal }): Promise<SocialSweepResponse> {
  return fetch(url, init);
}

function isRateLimited(status: number, body: MetaScrapeBody | null): boolean {
  if (status === 429 || status >= 500) return true;
  if (status !== 403) return false;
  if (body === null) return false;
  if (body.error?.code === 4) return true;
  const message = body.error?.message;
  return typeof message === 'string' && /request limit/iu.test(message);
}

function filled(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  return Array.isArray(value) && value.length > 0;
}

/**
 * Order hosts so the URLs most likely to be shared are swept first, with a
 * stable tiebreak so a persisted offset stays valid between runs.
 */
export function orderSweepHosts(hosts: readonly SocialSweepHost[]): readonly SocialSweepHost[] {
  return [...hosts].sort((left, right) => {
    if (left.apex !== right.apex) return left.apex ? -1 : 1;
    return left.hostname.localeCompare(right.hostname);
  });
}

async function scrapeOne(host: SocialSweepHost, appToken: string, fetchImpl: SocialSweepFetcher): Promise<SocialSweepResult> {
  const url = `https://${host.hostname}/`;
  const base = { hostname: host.hostname, url, appUsage: null, detail: null };
  try {
    const response = await fetchImpl(GRAPH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: url, scrape: 'true', access_token: appToken }).toString(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const appUsage = response.headers.get('x-app-usage');
    const text = await response.text();
    const body = ((): MetaScrapeBody | null => {
      try {
        return JSON.parse(text) as MetaScrapeBody;
      } catch {
        return null;
      }
    })();

    if (isRateLimited(response.status, body)) {
      const limited = body?.error?.message;
      return { ...base, outcome: 'rejected', incomplete: false, appUsage, detail: limited === undefined ? `http_${response.status}` : String(limited).slice(0, 200) };
    }
    if (body === null) {
      return { ...base, outcome: 'failed', incomplete: false, appUsage, detail: 'unparseable_response' };
    }
    if (response.status !== 200 || body.error !== undefined) {
      const message = body.error?.message;
      return { ...base, outcome: 'failed', incomplete: false, appUsage, detail: message === undefined ? `http_${response.status}` : String(message).slice(0, 200) };
    }
    if (!filled(body.title)) {
      return { ...base, outcome: 'unreachable', incomplete: true, appUsage, detail: 'meta_returned_no_metadata' };
    }
    const incomplete = !filled(body.description) || !filled(body.image) || !filled(body.site_name);
    return { ...base, outcome: 'verified', incomplete, appUsage, detail: null };
  } catch (error) {
    return { ...base, outcome: 'failed', incomplete: false, appUsage: null, detail: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Hand one bounded batch of tenant homepages to Meta's scrape endpoint.
 *
 * @param options - Ordered hosts, resume offset, batch limit, and app token.
 * @returns Per-host outcomes plus the offset the next run should resume from.
 * @remarks Never throws: every failure lands in the report so a cron run cannot
 * fail. A rate-limit rejection stops the batch immediately and does not advance
 * past that host, because the hosts behind it were never attempted.
 */
export async function sweepFacebookMetadata(options: SocialSweepOptions): Promise<SocialSweepReport> {
  const fetchImpl = options.fetchImpl ?? defaultFetcher;
  const ordered = orderSweepHosts(options.hosts);
  const results: SocialSweepResult[] = [];
  let halted = false;
  let nextOffset = options.offset;

  for (let index = options.offset; index < ordered.length && results.length < options.limit; index += 1) {
    const result = await scrapeOne(ordered[index]!, options.appToken, fetchImpl);
    results.push(result);
    if (result.outcome === 'rejected') {
      halted = true;
      break;
    }
    nextOffset = index + 1;
  }

  return {
    attempted: results.length,
    verified: results.filter((one) => one.outcome === 'verified' && !one.incomplete).length,
    incomplete: results.filter((one) => one.incomplete).length,
    unreachable: results.filter((one) => one.outcome === 'unreachable').length,
    rejected: results.filter((one) => one.outcome === 'rejected').length,
    failed: results.filter((one) => one.outcome === 'failed').length,
    halted,
    nextOffset: nextOffset >= ordered.length ? 0 : nextOffset,
    results,
  };
}
