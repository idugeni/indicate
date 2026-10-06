const LATIN_FOLD: Readonly<Record<string, string>> = {
  ł: 'l', đ: 'd', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss',
  þ: 'th', ð: 'd', ı: 'i', ħ: 'h', ŋ: 'n', ĸ: 'k',
};

/**
 * Build a URL slug from arbitrary text.
 *
 * @remarks Decomposing with NFKD and dropping combining marks turns accented Latin
 * into its base letter, so `Hôtel` becomes `hotel` and `Curaçao` becomes `curacao`.
 * The few Latin letters that carry no decomposition, Polish l-stroke and Vietnamese
 * d-stroke among them, are folded from `LATIN_FOLD` first. Underscore survives
 * because slugs persisted before this module existed were written with a `\w` class
 * that includes it, and rewriting them would break live URLs.
 *
 * Characters with no ASCII equivalent, such as CJK or Cyrillic, have nothing to fold
 * to and are dropped, so callers that persist the result must supply their own
 * fallback when the text is entirely non-Latin.
 *
 * @param value - Source text, typically a title or heading.
 * @returns Lowercase ASCII slug with single hyphen separators.
 * @example
 * ```ts
 * slugify('Đà Nẵng'); // 'da-nang'
 * ```
 */
export function slugify(value: string): string {
  const folded = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .split('')
    .map((char) => LATIN_FOLD[char] ?? char)
    .join('');
  return folded
    .replace(/[^a-z0-9_\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/gu, '');
}
