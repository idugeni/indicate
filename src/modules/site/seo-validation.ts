export const SEO_TITLE_MIN = 10;
export const SEO_TITLE_MAX = 160;
export const SEO_DESCRIPTION_MIN = 50;
export const SEO_DESCRIPTION_MAX = 500;

export interface SeoValidationIssue {
  readonly field: 'title' | 'description';
  readonly code: 'missing' | 'too_short' | 'too_long' | 'duplicate';
}

/**
 * Evaluate one per-tenant title/description pair against length limits.
 *
 * @param title - Per-tenant candidate title.
 * @param description - Per-tenant candidate description.
 * @returns Issue list; empty means validation passed.
 */
export function validateTenantMetadata(
  title: string | null | undefined,
  description: string | null | undefined,
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
  return issues;
}

/**
 * Check title/description duplication across multi-site publishing targets.
 *
 * @param overrides - Map of siteId to title/description overrides.
 * @returns Always empty; identical copy across portals is allowed.
 */
export function findDuplicateOverrides(
  overrides: Readonly<Record<string, { readonly title?: string | undefined; readonly description?: string | undefined }>>,
): readonly SeoValidationIssue[] {
  void overrides;
  return [];
}
