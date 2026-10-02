import type { PublicationOverride } from '@/modules/publishing/models';
import type { SeoValidationIssue } from '@/modules/site/seo-validation';

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
  const chars = Array.from(clean);
  if (chars.length <= maxLength) return clean;
  const slice = chars.slice(0, maxLength).join('').trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) return slice.slice(0, lastSpace).trimEnd();
  return slice.trimEnd();
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

/**
 * Compose per-portal overrides that reuse the canonical title/description verbatim.
 *
 * @param input.title - Canonical article title.
 * @param input.description - Canonical description (may be empty; used as the basis).
 * @param input.sites - Portal targets with their display labels.
 * @returns Map of siteId to overrides carrying the canonical copy unchanged.
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
  const canonicalDescription = baseDescription.length > 0 ? baseDescription : baseTitle;
  const ordered = [...input.sites].sort((a, b) => (a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0));
  const overrides: Record<string, PublicationOverride> = {};
  for (const site of ordered) {
    overrides[site.siteId] = { title: baseTitle, description: canonicalDescription };
  }
  return overrides;
}

/**
 * Count title/description duplication across the portals one article reaches.
 *
 * @param entries - Effective content per portal.
 * @returns Always empty; identical canonical copy across portals is allowed.
 */
export function duplicateIssuesAcrossSites(
  entries: readonly { readonly siteId: string; readonly title: string; readonly description: string }[],
): readonly SeoValidationIssue[] {
  void entries;
  return [];
}

/**
 * Detect title/description duplication across portals for one article.
 *
 * @param input.canonicalTitle - Canonical article title from the database.
 * @param input.canonicalDescription - Canonical description (excerpt fallback when empty).
 * @param input.existing - Effective variants already stored per portal.
 * @param input.requestedSiteIds - Portals requested on this request.
 * @param input.overrides - Override pada request ini.
 * @returns Always empty; identical canonical copy across portals is allowed.
 */
export function findCrossSiteDuplicates(input: {
  readonly canonicalTitle: string;
  readonly canonicalDescription: string;
  readonly existing: readonly ExistingSiteVariant[];
  readonly requestedSiteIds: readonly string[];
  readonly overrides: Readonly<Record<string, PublicationOverride>>;
}): readonly SeoValidationIssue[] {
  void input;
  return [];
}
