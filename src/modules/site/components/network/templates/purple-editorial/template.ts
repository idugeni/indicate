/**
 * Identitas template Purple Digital Editorial (ungu).
 *
 * @remarks
 * Satu dari sepuluh template tenant. Dispatcher `network-listing` switch ke id ini; fallback `clean-blue`.
 */
export const PURPLE_EDITORIAL_TEMPLATE_ID = 'purple-editorial' as const;

export type PurpleEditorialTemplateId = typeof PURPLE_EDITORIAL_TEMPLATE_ID;
