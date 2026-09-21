export const SLUG_MAX_LENGTH = 100;
export const TAG_MAX_LENGTH = 60;
export const TAG_MAX_COUNT = 10;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SUFFIX_ATTEMPTS = 1000;

/**
 * Normalize a slug candidate into canonical kebab-case.
 *
 * @param input - Free text (e.g. article title).
 * @returns Lowercase `[a-z0-9-]` slug up to `SLUG_MAX_LENGTH`; `'artikel'` when empty.
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
 * Allocate a unique slug within one organization.
 *
 * @param existingSlugs - Slugs already taken in the organization.
 * @param base - Requested base slug (normalized or not).
 * @param maxLength - Length limit; defaults to `SLUG_MAX_LENGTH` per the schema.
 * @returns Base slug when free, or the base plus a `-2`, `-3`, etc. suffix.
 * @throws {Error} When suffix space is exhausted (a near-impossible boundary failure).
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

/**
 * Normalize one tag candidate into canonical kebab-case.
 *
 * @param input - Free tag text (e.g. `Harga Emas`).
 * @returns Canonical tag up to `TAG_MAX_LENGTH`, or `null` when it has no alphanumerics.
 */
export function normalizeTagCandidate(input: string): string | null {
  if (!/[a-z0-9]/i.test(input)) return null;
  const tag = normalizeSlugCandidate(input).slice(0, TAG_MAX_LENGTH).replace(/-+$/g, '');
  return tag.length === 0 ? null : tag;
}

/**
 * Normalize a raw tag list into a stable canonical form for queries.
 *
 * @param input - Raw elements (strings or other values).
 * @returns Unique canonical tags in first-seen order.
 * @remarks Non-strings pass through untouched so schema validation still rejects them.
 */
export function normalizeTagList(input: readonly unknown[]): unknown[] {
  const seen = new Set<string>();
  const normalized: unknown[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      normalized.push(item);
      continue;
    }
    const tag = normalizeTagCandidate(item);
    if (tag === null || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
  }
  return normalized;
}
