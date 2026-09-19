/**
 * Identitas template Glassy Blue (kaca biru terang).
 *
 * @remarks
 * Satu dari sepuluh template tenant. Dispatcher `network-listing` switch ke id ini; id tak dikenal melempar galat.
 */
export const GLASSY_BLUE_TEMPLATE_ID = 'glassy-blue' as const;

export type GlassyBlueTemplateId = typeof GLASSY_BLUE_TEMPLATE_ID;
