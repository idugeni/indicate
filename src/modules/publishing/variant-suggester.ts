import type { PublicationOverride } from '@/modules/publishing/models';
import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_TITLE_MAX,
  SEO_TITLE_MIN,
  type SeoValidationIssue,
} from '@/modules/site/seo-validation';

const TITLE_ANGLES: readonly string[] = [
  'Sorotan',
  'Fokus',
  'Update',
  'Konteks',
  'Sorotan Khusus',
];

const DESCRIPTION_ANGLES: readonly string[] = [
  'Simak rincian dan dampaknya untuk warga',
  'Berikut konteks khusus yang perlu diketahui pembaca',
  'Liputan ini disesuaikan untuk pembaca',
  'Redaksi merangkum poin penting untuk',
];

export interface VariantSiteInput {
  readonly siteId: string;
  readonly label: string;
}

export interface ExistingSiteVariant {
  readonly siteId: string;
  readonly customTitle: string | null;
  readonly customDescription: string | null;
}

function collapse(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function fold(value: string): string {
  return value.trim().toLowerCase();
}

function truncateAtWord(value: string, maxLength: number): string {
  const chars = Array.from(value);
  if (chars.length <= maxLength) return value;
  const slice = chars.slice(0, maxLength).join('').trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) return slice.slice(0, lastSpace).trimEnd();
  return slice.trimEnd();
}

/**
 * Summarize a body into a description excerpt never cut mid-word.
 *
 * @param body - Canonical article body (may contain HTML).
 * @param maxLength - Length limit in unicode characters; defaults to 180.
 * @returns Clean excerpt; empty string when the body has no words.
 */
export function excerptForDescription(body: string, maxLength = 180): string {
  const clean = body.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (clean.length === 0) return '';
  return truncateAtWord(clean, maxLength);
}

/**
 * Derive a human-friendly site label from a normalized hostname.
 *
 * @param normalizedHostname - Lowercase ASCII hostname (e.g. `wonosobo.indicate.id`).
 * @returns Capitalized label from the first DNS label (`Wonosobo`).
 */
export function deriveSiteLabel(normalizedHostname: string): string {
  const first = normalizedHostname.split('.')[0] ?? '';
  const words = first.replace(/[-_]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Portal';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function fitTitle(base: string, suffix: string): string {
  if (Array.from(base).length + Array.from(suffix).length <= SEO_TITLE_MAX) return `${base}${suffix}`;
  const room = Math.max(1, SEO_TITLE_MAX - Array.from(suffix).length);
  return `${truncateAtWord(base, room)}${suffix}`;
}

function uniqueTitle(base: string, label: string, index: number, used: Set<string>): string {
  const angle = TITLE_ANGLES[index % TITLE_ANGLES.length] ?? 'Sorotan';
  const candidates = [
    fitTitle(base, ` — ${angle} ${label}`),
    fitTitle(base, `: Fokus ${label}`),
    fitTitle(base, ` — Update ${label}`),
    fitTitle(base, ` (${label})`),
  ];
  for (const candidate of candidates) {
    if (!used.has(fold(candidate)) && Array.from(candidate).length >= SEO_TITLE_MIN) return candidate;
  }
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const candidate = fitTitle(base, ` — ${label} ${attempt}`);
    if (!used.has(fold(candidate)) && Array.from(candidate).length >= SEO_TITLE_MIN) return candidate;
  }
  const fallback = fitTitle(base, ` — Laporan ${label} ${index + 1}`);
  if (Array.from(fallback).length < SEO_TITLE_MIN) return truncateAtWord(`${fallback} — laporan redaksi terbaru dari lapangan untuk pembaca`, SEO_TITLE_MAX);
  return fallback;
}

function uniqueDescription(canonical: string, label: string, index: number, used: Set<string>): string {
  const angle = DESCRIPTION_ANGLES[index % DESCRIPTION_ANGLES.length] ?? DESCRIPTION_ANGLES[0]!;
  const candidates = [
    `${canonical} ${angle} ${label}.`,
    `${canonical} Berikut konteks ${label} yang perlu diketahui.`,
    `${canonical} Liputan disesuaikan untuk pembaca ${label}.`,
  ];
  for (const candidate of candidates) {
    const text = truncateAtWord(collapse(candidate), SEO_DESCRIPTION_MAX);
    if (!used.has(fold(text)) && Array.from(text).length >= SEO_DESCRIPTION_MIN) return text;
  }
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const text = truncateAtWord(collapse(`${canonical} Versi ${attempt} untuk pembaca ${label}. ${angle} ${label}.`), SEO_DESCRIPTION_MAX);
    if (!used.has(fold(text)) && Array.from(text).length >= SEO_DESCRIPTION_MIN) return text;
  }
  return truncateAtWord(collapse(`${canonical} Laporan redaksi untuk ${label}.`), SEO_DESCRIPTION_MAX);
}

/**
 * Compose deterministic unique per-portal title/description overrides.
 *
 * @param input.title - Canonical article title.
 * @param input.description - Canonical description (may be empty; used as the basis).
 * @param input.sites - Portal targets with their display labels.
 * @param input.takenTitles - Effective titles already taken (old live variants).
 * @param input.takenDescriptions - Effective descriptions already taken.
 * @returns Map of siteId to overrides ready to send to `publication.request`.
 */
export function suggestPublicationVariants(input: {
  readonly title: string;
  readonly description: string;
  readonly sites: readonly VariantSiteInput[];
  readonly takenTitles?: readonly string[];
  readonly takenDescriptions?: readonly string[];
}): Record<string, PublicationOverride> {
  const baseTitle = collapse(input.title);
  const baseDescription = collapse(input.description);
  const ordered = [...input.sites].sort((a, b) => (a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0));
  const usedTitles = new Set((input.takenTitles ?? []).map(fold).filter((value) => value.length > 0));
  const usedDescriptions = new Set((input.takenDescriptions ?? []).map(fold).filter((value) => value.length > 0));
  const overrides: Record<string, PublicationOverride> = {};
  ordered.forEach((site, index) => {
    const title = uniqueTitle(baseTitle, site.label, index, usedTitles);
    usedTitles.add(fold(title));
    const description = uniqueDescription(baseDescription.length > 0 ? baseDescription : `${baseTitle} — laporan lengkap redaksi`, site.label, index, usedDescriptions);
    usedDescriptions.add(fold(description));
    overrides[site.siteId] = { title, description };
  });
  return overrides;
}

/**
 * Count title/description duplication with cascade families collapsed.
 *
 * @param entries - Effective content per site with its duplicate-counting family.
 * @returns Duplicate issues; content repeated only inside one family is safe.
 */
export function duplicateIssuesForFamilies(
  entries: readonly { readonly family: string; readonly title: string; readonly description: string }[],
): readonly SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const seenTitles = new Map<string, Set<string>>();
  const seenDescriptions = new Map<string, Set<string>>();
  for (const entry of entries) {
    const title = fold(entry.title);
    const description = fold(entry.description);
    if (title.length > 0) {
      const holders = seenTitles.get(title) ?? new Set<string>();
      holders.add(entry.family);
      seenTitles.set(title, holders);
    }
    if (description.length > 0) {
      const holders = seenDescriptions.get(description) ?? new Set<string>();
      holders.add(entry.family);
      seenDescriptions.set(description, holders);
    }
  }
  if ([...seenTitles.values()].some((holders) => holders.size > 1)) issues.push({ field: 'title', code: 'duplicate' });
  if ([...seenDescriptions.values()].some((holders) => holders.size > 1)) issues.push({ field: 'description', code: 'duplicate' });
  return issues;
}

/**
 * Detect title/description duplication across portals for one article.
 *
 * @param input.canonicalTitle - Canonical article title from the database.
 * @param input.canonicalDescription - Canonical description (excerpt fallback when empty).
 * @param input.existing - Effective variants already stored per portal.
 * @param input.requestedSiteIds - Portals requested on this request.
 * @param input.overrides - Override pada request ini.
 * @param input.families - Optional cascade family per site; sites sharing a
 * family never count as duplicates of each other (they share one canonical).
 * @returns Masalah duplikasi; kosong berarti aman tayang ke semua portal.
 */
export function findCrossSiteDuplicates(input: {
  readonly canonicalTitle: string;
  readonly canonicalDescription: string;
  readonly existing: readonly ExistingSiteVariant[];
  readonly requestedSiteIds: readonly string[];
  readonly overrides: Readonly<Record<string, PublicationOverride>>;
  readonly families?: Readonly<Record<string, string>> | undefined;
}): readonly SeoValidationIssue[] {
  const effective = new Map<string, { title: string; description: string }>();
  for (const variant of input.existing) {
    effective.set(variant.siteId, {
      title: variant.customTitle ?? input.canonicalTitle,
      description: variant.customDescription ?? input.canonicalDescription,
    });
  }
  for (const siteId of input.requestedSiteIds) {
    const override = input.overrides[siteId];
    const prior = effective.get(siteId);
    effective.set(siteId, {
      title: override?.title ?? prior?.title ?? input.canonicalTitle,
      description: override?.description ?? prior?.description ?? input.canonicalDescription,
    });
  }
  return duplicateIssuesForFamilies(
    [...effective].map(([siteId, value]) => ({ family: input.families?.[siteId] ?? siteId, title: value.title, description: value.description })),
  );
}
