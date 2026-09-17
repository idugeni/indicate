import { z } from 'zod';

export const PAGEVIEW_BODY_MAX_BYTES = 1024;

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
