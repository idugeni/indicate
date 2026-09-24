import type { NetworkSiteRow, PartnerRow } from '@/modules/content/site-content';

export const DIRECTORY_ACCENTS: readonly string[] = Object.freeze(['#b88d3a', '#2f4a3e', '#27435f', '#7c3030']);

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

/**
 * Split portal listings into main portals and regional editions.
 *
 * @param sites - Network sites ordered by hostname.
 * @returns Frozen split of main portals and regional editions.
 */
export function splitSites(sites: readonly NetworkSiteRow[]): {
  readonly main: readonly NetworkSiteRow[];
  readonly regional: readonly NetworkSiteRow[];
} {
  return Object.freeze({
    main: Object.freeze(sites.filter((site) => !site.isRegional)),
    regional: Object.freeze(sites.filter((site) => site.isRegional)),
  });
}

/**
 * Filter portal listings by free-text query and edition scope.
 *
 * @param sites - Network sites to filter.
 * @param query - Case-insensitive match against name, hostname, tagline, and description.
 * @param scope - Edition scope to keep.
 * @returns Filtered sites in input order.
 */
export function filterSites(
  sites: readonly NetworkSiteRow[],
  query: string,
  scope: 'all' | 'main' | 'regional',
): readonly NetworkSiteRow[] {
  const needle = query.trim().toLowerCase();
  return sites.filter((site) => {
    if (scope === 'main' && site.isRegional) return false;
    if (scope === 'regional' && !site.isRegional) return false;
    if (needle === '') return true;
    const haystack = `${site.siteName} ${site.hostname} ${site.tagline ?? ''} ${site.description}`.toLowerCase();
    return haystack.includes(needle);
  });
}

/**
 * Derive the city label from a regional hostname's first DNS label.
 *
 * @param hostname - Regional hostname (e.g. `wonosobo.fakta01.my.id`).
 * @returns City label with a leading capital (e.g. `Wonosobo`).
 */
export function cityOf(hostname: string): string {
  const label = hostname.split('.')[0] ?? hostname;
  return label.length === 0 ? hostname : label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Strip the city label from a regional hostname to find its parent portal.
 *
 * @param hostname - Hostname to resolve (e.g. `wonosobo.fakta01.my.id`).
 * @returns Parent hostname for four-label regional hostnames
 * (e.g. `fakta01.my.id`); apex hostnames pass through untouched.
 */
export function parentHostname(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length > 3 ? parts.slice(1).join('.') : hostname;
}

export interface RegionalCityGroup {
  readonly city: string;
  readonly items: readonly NetworkSiteRow[];
}

/**
 * Group regional editions by city so each city appears once as a heading.
 *
 * @param regional - Regional sites ordered by hostname.
 * @returns City groups in first-seen order, frozen.
 */
export function groupRegionalByCity(regional: readonly NetworkSiteRow[]): readonly RegionalCityGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, NetworkSiteRow[]>();
  for (const site of regional) {
    const city = cityOf(site.hostname);
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

export const PARTNER_FAMILIES: readonly string[] = Object.freeze(['LAPAS', 'RUTAN', 'BAPAS', 'LPKA']);

/**
 * Derive the institution family from a partner name prefix.
 *
 * @param name - Organization name as stored (e.g. `RUTAN KELAS II B DEMAK`).
 * @returns Family key, or `LAINNYA` when no known prefix matches.
 */
export function familyOf(name: string): string {
  const head = name.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
  return PARTNER_FAMILIES.includes(head) ? head : 'LAINNYA';
}

/**
 * Group partners by institution family, families in fixed order.
 *
 * @param partners - Partners ordered by name.
 * @returns Non-empty groups with counts preserved in display order.
 */
export function groupPartners(partners: readonly PartnerRow[]): readonly {
  readonly family: string;
  readonly items: readonly PartnerRow[];
}[] {
  const order = [...PARTNER_FAMILIES, 'LAINNYA'];
  const buckets = new Map<string, PartnerRow[]>();
  for (const partner of partners) {
    const family = familyOf(partner.name);
    const bucket = buckets.get(family);
    if (bucket === undefined) buckets.set(family, [partner]);
    else bucket.push(partner);
  }
  return Object.freeze(order.flatMap((family) => {
    const items = buckets.get(family);
    return items === undefined ? [] : [{ family, items: Object.freeze([...items]) }];
  }));
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
    if (family !== 'SEMUA' && familyOf(partner.name) !== family) return false;
    if (needle === '') return true;
    return `${partner.name} ${partner.slug}`.toLowerCase().includes(needle);
  });
}
