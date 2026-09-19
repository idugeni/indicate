/**
 * Identitas template Clean Blue Editorial.
 *
 * @remarks
 * Satu dari sepuluh template tenant. Dispatcher `network-listing` switch ke
 * id ini; id tak dikenal melempar galat.
 */
export const CLEAN_BLUE_TEMPLATE_ID = 'clean-blue' as const;

export type CleanBlueTemplateId = typeof CLEAN_BLUE_TEMPLATE_ID;
