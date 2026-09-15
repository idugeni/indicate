export const SLUG_MAX_LENGTH = 100;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SUFFIX_ATTEMPTS = 1000;

/**
 * Menormalkan kandidat slug ke bentuk kanonik kebab-case.
 *
 * @param input - Teks bebas (mis. judul artikel).
 * @returns Slug lowercase `[a-z0-9-]` maksimal `SLUG_MAX_LENGTH`; `'artikel'` bila kosong.
 */
export function normalizeSlugCandidate(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  return slug.length === 0 ? 'artikel' : slug;
}

/**
 * Mengalokasikan slug unik dalam satu organisasi.
 *
 * @param existingSlugs - Slug yang sudah terpakai di organisasi.
 * @param base - Slug dasar yang diminta (sudah/belum ternormalisasi).
 * @param maxLength - Batas panjang; default `SLUG_MAX_LENGTH` mengikuti skema.
 * @returns Slug dasar bila bebas, atau dasar ditambah akhiran `-2`, `-3`, dst.
 * @throws {Error} Bila ruang akhiran habis (kegagalan batas yang nyaris mustahil).
 * @example
 * ```ts
 * allocateUniqueSlug(['rutan-wonosobo'], 'Rutan Wonosobo');
 * // 'rutan-wonosobo-2'
 * ```
 */
export function allocateUniqueSlug(existingSlugs: readonly string[], base: string, maxLength = SLUG_MAX_LENGTH): string {
  const normalized = normalizeSlugCandidate(base).slice(0, maxLength).replace(/-+$/g, '') || 'artikel';
  const taken = new Set(existingSlugs.map((slug) => slug.toLowerCase()));
  if (!taken.has(normalized) && SLUG_PATTERN.test(normalized)) return normalized;
  for (let attempt = 2; attempt <= MAX_SUFFIX_ATTEMPTS; attempt += 1) {
    const suffix = `-${attempt}`;
    const stem = normalized.slice(0, Math.max(1, maxLength - suffix.length)).replace(/-+$/g, '');
    const candidate = `${stem}${suffix}`;
    if (!taken.has(candidate) && SLUG_PATTERN.test(candidate)) return candidate;
  }
  throw new Error('Slug space exhausted');
}
