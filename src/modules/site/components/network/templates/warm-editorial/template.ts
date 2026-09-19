/**
 * Identitas template Warm Editorial (terakota serif).
 *
 * @remarks
 * Satu dari sepuluh template tenant. Dispatcher `network-listing` switch ke id ini; fallback `clean-blue`.
 */
export const WARM_EDITORIAL_TEMPLATE_ID = 'warm-editorial' as const;

export type WarmEditorialTemplateId = typeof WARM_EDITORIAL_TEMPLATE_ID;
