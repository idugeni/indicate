/**
 * Identitas template Soft Blue Cards (biru lembut).
 *
 * @remarks
 * Satu dari sepuluh template tenant. Dispatcher `network-listing` switch ke id ini; fallback `clean-blue`.
 */
export const SOFT_BLUE_TEMPLATE_ID = 'soft-blue' as const;

export type SoftBlueTemplateId = typeof SOFT_BLUE_TEMPLATE_ID;
