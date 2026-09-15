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
 * Meringkas body menjadi kutipan deskripsi yang tidak terpotong di tengah kata.
 *
 * @param body - Body kanonik artikel (boleh mengandung HTML).
 * @param maxLength - Batas panjang dalam karakter unicode; default 180.
 * @returns Kutipan bersih; string kosong bila body tidak memiliki kata.
 */
export function excerptForDescription(body: string, maxLength = 180): string {
  const clean = body.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (clean.length === 0) return '';
  return truncateAtWord(clean, maxLength);
}

/**
 * Menurunkan label situs yang ramah dibaca dari hostname ternormalisasi.
 *
 * @param normalizedHostname - Hostname ASCII lowercase (mis. `wonosobo.indicate.id`).
 * @returns Label kapital dari label DNS pertama (`Wonosobo`).
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
 * Menyusun override judul/deskripsi unik per portal secara deterministik.
 *
 * @param input.title - Judul kanonik artikel.
 * @param input.description - Deskripsi kanonik (boleh kosong; dipakai sebagai basis).
 * @param input.sites - Target portal beserta label tampilannya.
 * @param input.takenTitles - Judul efektif yang sudah terpakai (varian tayang lama).
 * @param input.takenDescriptions - Deskripsi efektif yang sudah terpakai.
 * @returns Peta siteId ke override siap kirim ke `publication.request`.
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
 * Mendeteksi duplikasi judul/deskripsi lintas portal untuk satu artikel.
 *
 * @param input.canonicalTitle - Judul kanonik artikel dari database.
 * @param input.canonicalDescription - Deskripsi kanonik (fallback excerpt bila kosong).
 * @param input.existing - Varian efektif yang sudah tersimpan per portal.
 * @param input.requestedSiteIds - Portal yang diminta pada request ini.
 * @param input.overrides - Override pada request ini.
 * @returns Masalah duplikasi; kosong berarti aman tayang ke semua portal.
 */
export function findCrossSiteDuplicates(input: {
  readonly canonicalTitle: string;
  readonly canonicalDescription: string;
  readonly existing: readonly ExistingSiteVariant[];
  readonly requestedSiteIds: readonly string[];
  readonly overrides: Readonly<Record<string, PublicationOverride>>;
}): readonly SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
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
  const seenTitles = new Map<string, number>();
  const seenDescriptions = new Map<string, number>();
  for (const value of effective.values()) {
    const title = fold(value.title);
    const description = fold(value.description);
    if (title.length > 0) seenTitles.set(title, (seenTitles.get(title) ?? 0) + 1);
    if (description.length > 0) seenDescriptions.set(description, (seenDescriptions.get(description) ?? 0) + 1);
  }
  if ([...seenTitles.values()].some((count) => count > 1)) issues.push({ field: 'title', code: 'duplicate' });
  if ([...seenDescriptions.values()].some((count) => count > 1)) issues.push({ field: 'description', code: 'duplicate' });
  return issues;
}
