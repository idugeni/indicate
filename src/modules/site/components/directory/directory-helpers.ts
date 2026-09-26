import type { DirectoryEntry, PartnerRow } from '@/modules/content/site-content';

export const DIRECTORY_ACCENTS: readonly string[] = Object.freeze([
  '#b88d3a',
  '#2f4a3e',
  '#27435f',
  '#7c3030',
  '#1f7cff',
  '#b4532a',
  '#4b3f66',
  '#2e5b3f',
  '#0f766e',
  '#c2410c',
  '#4338ca',
  '#be123c',
]);

export const DIRECTORY_PATTERNS: readonly string[] = Object.freeze(['solid', 'gradient', 'stripes', 'duotone']);

export const WORDMARK_PATTERNS: readonly string[] = Object.freeze(['head', 'tail', 'full', 'bookend', 'alternate']);

/**
 * Pick a deterministic wordmark coloring scheme for a hostname.
 *
 * @param hostname - Portal hostname used as the hash seed.
 * @returns One of the five wordmark pattern keys.
 */
export function wordmarkPatternForHostname(hostname: string): string {
  let hash = 13;
  for (let index = 0; index < hostname.length; index += 1) {
    hash = (hash * 31 + hostname.charCodeAt(index)) >>> 0;
  }
  return WORDMARK_PATTERNS[Math.floor(hash / (DIRECTORY_ACCENTS.length * DIRECTORY_PATTERNS.length)) % WORDMARK_PATTERNS.length] ?? WORDMARK_PATTERNS[0] ?? 'head';
}

const WORDMARK_INK = '#1a2430';
const WORDMARK_MID = '#5f6b7a';

/**
 * Resolve one color per wordmark token for a coloring scheme.
 *
 * @param tokenCount - Number of word tokens to color.
 * @param accent - Per-portal accent hex.
 * @param pattern - Pattern key from `wordmarkPatternForHostname`.
 * @returns Frozen color per token in order.
 */
export function wordmarkColors(tokenCount: number, accent: string, pattern: string): readonly string[] {
  const colors: string[] = [];
  for (let index = 0; index < tokenCount; index += 1) {
    const first = index === 0;
    const last = index === tokenCount - 1;
    switch (pattern) {
      case 'tail':
        colors.push(first && !last ? WORDMARK_INK : last ? accent : WORDMARK_MID);
        break;
      case 'full':
        colors.push(accent);
        break;
      case 'bookend':
        colors.push(first || last ? accent : WORDMARK_MID);
        break;
      case 'alternate':
        colors.push(index % 2 === 0 ? accent : WORDMARK_INK);
        break;
      default:
        colors.push(first ? accent : last ? WORDMARK_INK : WORDMARK_MID);
        break;
    }
  }
  return Object.freeze(colors);
}

/**
 * Pick a deterministic decorative pattern for a hostname.
 *
 * @param hostname - Portal hostname used as the hash seed.
 * @returns One of the four directory pattern keys.
 */
export function patternForHostname(hostname: string): string {
  let hash = 7;
  for (let index = 0; index < hostname.length; index += 1) {
    hash = (hash * 31 + hostname.charCodeAt(index)) >>> 0;
  }
  return DIRECTORY_PATTERNS[Math.floor(hash / DIRECTORY_ACCENTS.length) % DIRECTORY_PATTERNS.length] ?? DIRECTORY_PATTERNS[0] ?? 'solid';
}

/**
 * Render the accent edge for a directory card.
 *
 * @param accent - Per-portal accent hex.
 * @param pattern - Pattern key from `patternForHostname`.
 * @returns Inline style for the accent edge element.
 */
export function accentEdgeStyle(accent: string, pattern: string): Readonly<Record<string, string>> {
  switch (pattern) {
    case 'gradient':
      return { background: `linear-gradient(180deg, ${accent} 0%, #1a2430 135%)` };
    case 'stripes':
      return { background: `repeating-linear-gradient(135deg, ${accent} 0 6px, rgba(26,36,48,0.3) 6px 8px)` };
    case 'duotone':
      return { background: `linear-gradient(180deg, ${accent} 0 55%, #1a2430 55% 100%)` };
    default:
      return { backgroundColor: accent };
  }
}

/**
 * Pick a deterministic accent from the showcase palette for a hostname.
 *
 * @param hostname - Portal hostname used as the hash seed.
 * @returns One of the four directory accent hex values.
 */
export function accentForHostname(hostname: string): string {
  let hash = 0;
  for (let index = 0; index < hostname.length; index += 1) {
    hash = (hash * 31 + hostname.charCodeAt(index)) >>> 0;
  }
  return DIRECTORY_ACCENTS[hash % DIRECTORY_ACCENTS.length] ?? DIRECTORY_ACCENTS[0] ?? '#b88d3a';
}

/** Result ceiling for a searched directory; browsing stays aggregated per city. */
export const DIRECTORY_RESULT_LIMIT = 48;

/**
 * Split portal listings into main portals and regional editions.
 *
 * @param sites - Network sites ordered by hostname.
 * @returns Frozen split of apex portals and their region/city editions.
 */
export function splitSites(sites: readonly DirectoryEntry[]): {
  readonly main: readonly DirectoryEntry[];
  readonly regional: readonly DirectoryEntry[];
} {
  return Object.freeze({
    main: Object.freeze(sites.filter((site) => site.siteLevel === 'apex')),
    regional: Object.freeze(sites.filter((site) => site.siteLevel !== 'apex')),
  });
}

/**
 * Filter portal listings by free-text query and edition scope.
 *
 * @param sites - Network sites to filter.
 * @param query - Case-insensitive match against name, hostname, area, tagline, and description.
 * @param scope - Edition scope to keep.
 * @returns Filtered sites in input order.
 */
export function filterSites(
  sites: readonly DirectoryEntry[],
  query: string,
  scope: 'all' | 'main' | 'regional',
): readonly DirectoryEntry[] {
  const needle = query.trim().toLowerCase();
  return sites.filter((site) => {
    if (scope === 'main' && site.siteLevel !== 'apex') return false;
    if (scope === 'regional' && site.siteLevel === 'apex') return false;
    if (needle === '') return true;
    const haystack = `${site.siteName} ${site.hostname} ${site.areaName ?? ''} ${site.tagline ?? ''} ${site.description ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

/**
 * Label of the geography a portal serves.
 *
 * @param site - Network site row.
 * @returns Geography name, falling back to the first DNS label for apex portals.
 */
export function areaOf(site: DirectoryEntry): string {
  if (site.areaName !== null && site.areaName !== '') return site.areaName;
  const label = site.hostname.split('.')[0] ?? site.hostname;
  return label.length === 0 ? site.hostname : label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Bound a rendered result set and report what was withheld.
 *
 * @param entries - Matching portals in listing order.
 * @param limit - Maximum entries to render; defaults to `DIRECTORY_RESULT_LIMIT`.
 * @returns The visible slice and the number of matches left unrendered.
 * @remarks The count is always reported, so a capped list never claims to be
 * the whole result set.
 */
export function capDirectoryResults(
  entries: readonly DirectoryEntry[],
  limit: number = DIRECTORY_RESULT_LIMIT,
): { readonly shown: readonly DirectoryEntry[]; readonly hidden: number } {
  return Object.freeze({ shown: Object.freeze(entries.slice(0, limit)), hidden: Math.max(0, entries.length - limit) });
}

/**
 * Build the directory structured data.
 *
 * @param sites - Every active portal.
 * @param pageUrl - Canonical URL of the directory page.
 * @returns JSON-LD payload describing the page, its apex portals, and its city ledger.
 * @remarks Only the units a visitor can actually reach from the page are listed:
 * the apex portals carry a card and a link, and the city tiles carry a count. The
 * thousands of regional portals behind each count stay out of the payload, which
 * keeps the script small and keeps the markup honest about what is on the page.
 */
export function buildDirectoryJsonLd(
  sites: readonly DirectoryEntry[],
  pageUrl: string,
): Readonly<Record<string, unknown>> {
  const { main, regional } = splitSites(sites);
  const cities = groupRegionalByCity(regional).map((group) => ({
    '@type': 'ListItem',
    name: group.city,
    description: `${group.items.length} portal`,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Jaringan portal Indicate',
    description: 'Direktori portal aktif di jaringan Indicate: portal utama nasional dan edisi daerah per kota.',
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      name: 'Portal utama',
      numberOfItems: main.length,
      itemListElement: main.map((site, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: { '@type': 'WebSite', name: site.siteName, url: `https://${site.hostname}` },
      })),
    },
    hasPart: {
      '@type': 'ItemList',
      name: 'Edisi daerah per kota',
      numberOfItems: cities.length,
      itemListElement: cities,
    },
  };
}

export interface RegionalCityGroup {
  readonly city: string;
  readonly items: readonly DirectoryEntry[];
}

/**
 * Group regional editions by the city they serve so each city appears once.
 *
 * @param regional - Region and city portals ordered by hostname.
 * @returns City groups in first-seen order, frozen.
 * @remarks A region edition is the parent of its cities, not a city itself, so it
 * never forms a tile. Letting `jawa-tengah.<apex>` through would print the region
 * as a city beside its own children, inflate the city count, and repeat the same
 * mistake in the directory JSON-LD. Region portals stay reachable through search.
 */
export function groupRegionalByCity(regional: readonly DirectoryEntry[]): readonly RegionalCityGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, DirectoryEntry[]>();
  for (const site of regional) {
    if (site.siteLevel !== 'city') continue;
    const city = areaOf(site);
    const bucket = buckets.get(city);
    if (bucket === undefined) {
      order.push(city);
      buckets.set(city, [site]);
    } else {
      bucket.push(site);
    }
  }
  return Object.freeze(order.map((city) => ({ city, items: Object.freeze([...(buckets.get(city) ?? [])]) })));
}

/**
 * Split a CamelCase portal name into word tokens for two/three-tone rendering.
 *
 * @param name - Stored portal name (e.g. `SuaraFakta24`, `PenaMerdeka`).
 * @returns Word tokens in order, never empty.
 */
export function splitWordmark(name: string): readonly string[] {
  const tokens = name
    .split(/(?<=[a-z])(?=[A-Z0-9])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])/)
    .map((token) => token.trim())
    .filter((token) => token !== '');
  return Object.freeze(tokens.length === 0 ? [name] : tokens);
}

/** Scope value keeping every family in `filterPartners`. */
export const ALL_PARTNER_FAMILIES = 'SEMUA';

/**
 * Derive the institution family from a partner name prefix.
 *
 * @param name - Organization name as stored (e.g. `RUTAN KELAS II B DEMAK`).
 * @returns Uppercase head token; `LAINNYA` when the name is blank.
 */
export function familyOf(name: string): string {
  const head = name.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
  return head === '' ? 'LAINNYA' : head;
}

/**
 * Group partners by institution family in first-seen order.
 *
 * @param partners - Partners ordered by name.
 * @returns Non-empty groups with counts preserved in display order.
 */
export function groupPartners(partners: readonly PartnerRow[]): readonly {
  readonly family: string;
  readonly items: readonly PartnerRow[];
}[] {
  const order: string[] = [];
  const buckets = new Map<string, PartnerRow[]>();
  for (const partner of partners) {
    const family = familyOf(partner.name);
    const bucket = buckets.get(family);
    if (bucket === undefined) {
      order.push(family);
      buckets.set(family, [partner]);
    } else bucket.push(partner);
  }
  return Object.freeze(order.map((family) => ({ family, items: Object.freeze([...(buckets.get(family) ?? [])]) })));
}

/**
 * Filter partners by free-text query and family.
 *
 * @param partners - Partners to filter.
 * @param query - Case-insensitive match against name and slug.
 * @param family - Family key to keep, or `SEMUA` for every family.
 * @returns Filtered partners in input order.
 */
export function filterPartners(
  partners: readonly PartnerRow[],
  query: string,
  family: string,
): readonly PartnerRow[] {
  const needle = query.trim().toLowerCase();
  return partners.filter((partner) => {
    if (family !== ALL_PARTNER_FAMILIES && familyOf(partner.name) !== family) return false;
    if (needle === '') return true;
    return `${partner.name} ${partner.slug}`.toLowerCase().includes(needle);
  });
}
