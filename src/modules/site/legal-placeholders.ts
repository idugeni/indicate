import type { DocSectionItem } from '@/modules/site/components/layout/content';

export interface LegalVariables {
  readonly domain: string;
  readonly siteName: string;
}

/**
 * Interpolate `{domain}` and `{siteName}` tokens in legal document copy.
 *
 * @param value - Master text from `marketing-content` (never contains a literal domain).
 * @param vars - Domain and site name of the active tenant from hostname resolution.
 * @returns Render-ready text for that tenant; no tokens means no changes.
 */
export function interpolateLegalText(value: string, vars: LegalVariables): string {
  return value.replaceAll('{domain}', vars.domain).replaceAll('{siteName}', vars.siteName);
}

/**
 * Apply domain interpolation to every section of one legal document.
 *
 * @param sections - Master sections (`TERMS_SECTIONS` / `PRIVACY_SECTIONS`).
 * @param vars - Domain and site name of the active tenant from hostname resolution.
 * @returns Section copies with interpolated headings and bodies.
 */
export function resolveLegalSections(
  sections: readonly DocSectionItem[],
  vars: LegalVariables,
): DocSectionItem[] {
  return sections.map((section) => ({
    heading: interpolateLegalText(section.heading, vars),
    body: interpolateLegalText(section.body, vars),
  }));
}
