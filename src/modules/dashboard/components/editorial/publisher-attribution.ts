const PRESERVED_ACRONYMS: ReadonlySet<string> = new Set(['LPKA']);

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word === '') return word;
      if (PRESERVED_ACRONYMS.has(word.toUpperCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function stripClassDesignation(upper: string): string {
  return upper
    .replace(/\sKELAS\s+[IVX]+(\s+[A-Z](?=\s))?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build an attribution label suggestion from the official name ("RUTAN KELAS II B WONOSOBO"
 * becomes "Humas Rutan Wonosobo"); non-agency institutions use Title Case
 * as-is. Its SQL mirror lives in
 * `indicate_private.short_attribution_label`; change both when the rule changes.
 *
 * @param name - Official publisher name as-is (any casing).
 * @param type - Entity classification from the form (`government_institution` vs others).
 * @returns Suggested label; empty string when the name is empty.
 */
export function suggestAttributionLabel(name: string, type: string): string {
  const short = toTitleCase(stripClassDesignation(name.trim().toUpperCase()));
  if (short === '') return '';
  return type === 'government_institution' ? `Humas ${short}` : short;
}
