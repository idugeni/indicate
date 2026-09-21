export const SEO_TITLE_MIN = 10;
export const SEO_TITLE_MAX = 160;
export const SEO_DESCRIPTION_MIN = 50;
export const SEO_DESCRIPTION_MAX = 500;

export interface SeoValidationIssue {
  readonly field: 'title' | 'description';
  readonly code: 'missing' | 'too_short' | 'too_long' | 'duplicate';
}

/**
 * Evaluate one per-tenant title/description pair against thin/duplicate limits.
 *
 * @param title - Per-tenant candidate title.
 * @param description - Per-tenant candidate description.
 * @param siblingTitles - Other tenants' titles for the same article.
 * @param siblingDescriptions - Other tenants' descriptions for the same article.
 * @returns Issue list; empty means validation passed.
 */
export function validateTenantMetadata(
  title: string | null | undefined,
  description: string | null | undefined,
  siblingTitles: readonly string[] = [],
  siblingDescriptions: readonly string[] = [],
): readonly SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const normalizedTitle = (title ?? '').trim();
  const normalizedDescription = (description ?? '').trim();
  if (normalizedTitle.length === 0) {
    issues.push({ field: 'title', code: 'missing' });
  } else if (Array.from(normalizedTitle).length < SEO_TITLE_MIN) {
    issues.push({ field: 'title', code: 'too_short' });
  } else if (Array.from(normalizedTitle).length > SEO_TITLE_MAX) {
    issues.push({ field: 'title', code: 'too_long' });
  }
  if (normalizedDescription.length === 0) {
    issues.push({ field: 'description', code: 'missing' });
  } else if (Array.from(normalizedDescription).length < SEO_DESCRIPTION_MIN) {
    issues.push({ field: 'description', code: 'too_short' });
  } else if (Array.from(normalizedDescription).length > SEO_DESCRIPTION_MAX) {
    issues.push({ field: 'description', code: 'too_long' });
  }
  const foldedTitle = normalizedTitle.toLowerCase();
  if (foldedTitle.length > 0 && siblingTitles.some((sibling) => sibling.trim().toLowerCase() === foldedTitle)) {
    issues.push({ field: 'title', code: 'duplicate' });
  }
  const foldedDescription = normalizedDescription.toLowerCase();
  if (foldedDescription.length > 0 && siblingDescriptions.some((sibling) => sibling.trim().toLowerCase() === foldedDescription)) {
    issues.push({ field: 'description', code: 'duplicate' });
  }
  return issues;
}

/**
 * Check title/description duplication across multi-site publishing targets.
 *
 * @param overrides - Map of siteId to title/description overrides.
 * @returns Duplication issues; empty means every target is differentiated.
 */
export function findDuplicateOverrides(
  overrides: Readonly<Record<string, { readonly title?: string | undefined; readonly description?: string | undefined }>>,
): readonly SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const seenTitles = new Map<string, number>();
  const seenDescriptions = new Map<string, number>();
  for (const override of Object.values(overrides)) {
    const title = (override.title ?? '').trim().toLowerCase();
    const description = (override.description ?? '').trim().toLowerCase();
    if (title.length > 0) seenTitles.set(title, (seenTitles.get(title) ?? 0) + 1);
    if (description.length > 0) seenDescriptions.set(description, (seenDescriptions.get(description) ?? 0) + 1);
  }
  if ([...seenTitles.values()].some((count) => count > 1)) issues.push({ field: 'title', code: 'duplicate' });
  if ([...seenDescriptions.values()].some((count) => count > 1)) issues.push({ field: 'description', code: 'duplicate' });
  return issues;
}
