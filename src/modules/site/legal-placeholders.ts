import type { DocSectionItem } from '@/modules/site/components/layout/content';

export interface LegalVariables {
  readonly domain: string;
  readonly siteName: string;
}

/**
 * Interpolasi token `{domain}` dan `{siteName}` pada copy dokumen legal.
 *
 * @param value - Teks master dari `marketing-content` (tetap tanpa domain literal).
 * @param vars - Domain dan nama situs tenant aktif hasil resolusi hostname.
 * @returns Teks siap render untuk tenant tersebut; tanpa token berarti tanpa perubahan.
 */
export function interpolateLegalText(value: string, vars: LegalVariables): string {
  return value.replaceAll('{domain}', vars.domain).replaceAll('{siteName}', vars.siteName);
}

/**
 * Terapkan interpolasi domain ke seluruh bagian satu dokumen legal.
 *
 * @param sections - Bagian master (`TERMS_SECTIONS` / `PRIVACY_SECTIONS`).
 * @param vars - Domain dan nama situs tenant aktif hasil resolusi hostname.
 * @returns Salinan bagian dengan heading dan body terinterpolasi.
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
