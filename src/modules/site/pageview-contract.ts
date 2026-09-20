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
 * Serialisasi payload beacon menjadi body JSON; tolak input tak valid di sumber.
 *
 * @param input - Kandidat payload `{o, s, a}` dari komponen beacon.
 * @returns Body JSON siap kirim, atau null bila tidak lolos skema.
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
 * Susun kunci counter Redis untuk satu view tervalidasi.
 *
 * @param environment - Nama environment runtime (mis. `production`).
 * @param beacon - Payload beacon yang sudah lolos skema.
 * @returns Kunci `pv:{environment}:{organizationId}:{siteId}:{articleSiteId}`.
 */
export function buildPageviewKey(environment: string, beacon: PageviewBeacon): string {
  return `pv:${environment}:${beacon.o}:${beacon.s}:${beacon.a}`;
}

/**
 * Tentukan apakah permintaan beacon berasal dari bot/pemindai otomatis.
 *
 * @param userAgent - Nilai header `User-Agent`; null bila tidak ada.
 * @param cf - Sinyal verifikasi Cloudflare yang dinormalisasi dari `request.cf`.
 * @returns True bila terindikasi bot; UA kosong fail-open agar pembaca sah tak hilang.
 */
export function isBotPageview(userAgent: string | null, cf?: PageviewCfHints | null): boolean {
  if (cf?.verifiedBot === true) return true;
  if (typeof cf?.botScore === 'number' && Number.isFinite(cf.botScore) && cf.botScore < 30) return true;
  if (typeof cf?.threatScore === 'number' && Number.isFinite(cf.threatScore) && cf.threatScore >= 50) return true;
  if (userAgent === null || userAgent === '') return false;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

/**
 * Urai kunci counter Redis; tolak bentuk asing tanpa melempar.
 *
 * @param key - Kunci kandidat dari hasil SCAN.
 * @returns Identitas tenant atau null bila bukan kunci pageview valid.
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
