/**
 * Identitas template Red Editorial (merah serif).
 *
 * @remarks
 * Satu dari sepuluh template tenant. Dispatcher `network-listing` switch ke id ini; id tak dikenal melempar galat.
 */
export const RED_EDITORIAL_TEMPLATE_ID = 'red-editorial' as const;

export type RedEditorialTemplateId = typeof RED_EDITORIAL_TEMPLATE_ID;
