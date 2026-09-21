import { z } from 'zod';

export const PAGEVIEW_BODY_MAX_BYTES = 1024;

export const PAGEVIEW_KEY_TTL_SECONDS = 604_800;

const BOT_USER_AGENT_PATTERN = /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|archive\.org|ahrefs|semrush|mj12|dotbot|petal|bytespider|gptbot|claudebot|ccbot|anthropic|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|whatsapp|python-requests|python-urllib|curl|wget|httpie|httpclient|okhttp|postman|insomnia|headless|phantomjs|selenium|playwright|puppeteer/i;

export interface PageviewCfHints {
  readonly verifiedBot?: boolean | undefined;
  readonly botScore?: number | undefined;
  readonly threatScore?: number | undefined;
}

export const pageviewBeaconSchema = z.object({ o: z.uuid(), s: z.uuid(), a: z.uuid() }).strict();

export type PageviewBeacon = z.infer<typeof pageviewBeaconSchema>;

export interface PageviewKeyIdentity {
  readonly organizationId: string;
  readonly siteId: string;
  readonly articleSiteId: string;
}

export const VIEW_COUNT_FRESHNESS_NOTE = 'Angka views diperbarui harian.';

/**
 * Serialize the beacon payload into a JSON body; reject invalid input at the source.
 *
 * @param input - Candidate `{o, s, a}` payload from the beacon component.
 * @returns JSON body ready to send, or null when it fails schema validation.
 */
export function serializePageviewBeacon(input: {
  readonly o: string;
  readonly s: string;
  readonly a: string;
}): string | null {
  const parsed = pageviewBeaconSchema.safeParse(input);
  if (!parsed.success) return null;
  return JSON.stringify(parsed.data);
}

/**
 * Build the Redis counter key for one validated view.
 *
 * @param environment - Runtime environment name (e.g. `production`).
 * @param beacon - Beacon payload that already passed schema validation.
 * @returns Key `pv:{environment}:{organizationId}:{siteId}:{articleSiteId}`.
 */
export function buildPageviewKey(environment: string, beacon: PageviewBeacon): string {
  return `pv:${environment}:${beacon.o}:${beacon.s}:${beacon.a}`;
}

/**
 * Determine whether a beacon request comes from a bot/automated crawler.
 *
 * @param userAgent - `User-Agent` header value; null when absent.
 * @param cf - Normalized Cloudflare verification signals from `request.cf`.
 * @returns True when indicated as a bot; empty UA fails open so legitimate readers are never lost.
 */
export function isBotPageview(userAgent: string | null, cf?: PageviewCfHints | null): boolean {
  if (cf?.verifiedBot === true) return true;
  if (typeof cf?.botScore === 'number' && Number.isFinite(cf.botScore) && cf.botScore < 30) return true;
  if (typeof cf?.threatScore === 'number' && Number.isFinite(cf.threatScore) && cf.threatScore >= 50) return true;
  if (userAgent === null || userAgent === '') return false;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

/**
 * Parse a Redis counter key; reject foreign shapes without throwing.
 *
 * @param key - Candidate key from a SCAN result.
 * @returns Tenant identity, or null when not a valid pageview key.
 */
export function parsePageviewKey(key: string): PageviewKeyIdentity | null {
  const parts = key.split(':');
  if (parts.length !== 5 || parts[0] !== 'pv') return null;
  const [, environment, organizationId, siteId, articleSiteId] = parts;
  if (
    environment === undefined ||
    environment === '' ||
    organizationId === undefined ||
    organizationId === '' ||
    siteId === undefined ||
    siteId === '' ||
    articleSiteId === undefined ||
    articleSiteId === ''
  ) {
    return null;
  }
  return { organizationId, siteId, articleSiteId };
}
