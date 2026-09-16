/**
 * Identitas tunggal template Clean Blue Editorial.
 *
 * @remarks
 * Satu-satunya template tenant yang diakui runtime. Dispatcher
 * `network-listing` selalu jatuh ke id ini.
 */
export const CLEAN_BLUE_TEMPLATE_ID = 'clean-blue' as const;

export type CleanBlueTemplateId = typeof CLEAN_BLUE_TEMPLATE_ID;
