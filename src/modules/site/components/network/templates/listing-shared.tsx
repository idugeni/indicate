/**
 * Kebenaran dispatch runtime template tenant.
 *
 * @remarks
 * Berkas ini disengaja ramping: hanya id template dan normalisasi.
 * Seluruh UI legacy (`ArticleCard`, `PopularAside`, dsb.) sudah dipensiunkan
 * saat refactor modular `clean-blue/` — format dan kartu kini milik
 * `clean-blue/lib/format.ts` dan `clean-blue/cards/`.
 */
export const TEMPLATE_IDS = ['clean-blue'] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * Normalisasi id template mentah ke id yang diakui.
 *
 * @param raw - Nilai mentah dari `site_settings.colors.templateId`.
 * @returns Id template valid, fallback `clean-blue`.
 */
export function normalizeTemplateId(raw: unknown): TemplateId {
  if (typeof raw === 'string' && (TEMPLATE_IDS as readonly string[]).includes(raw)) {
    return raw as TemplateId;
  }
  return 'clean-blue';
}
