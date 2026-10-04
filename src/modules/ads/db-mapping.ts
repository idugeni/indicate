import type { TemplateId } from '@/modules/site/components/network/templates/listing-shared';

import { AD_SLOT_IDS, type AdSlotId } from '@/modules/ads/slots';
import { isAdCreative, type AdCreative } from '@/modules/ads/creatives';
import type { CampaignAdOverrides, TenantAdOverrides } from '@/modules/ads/config';

/** Flat creative columns as projected by the delivery read path. */
export interface DbCreativeFields {
  readonly kind: string | null;
  readonly imageUrl: string | null;
  readonly href: string | null;
  readonly altText: string | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly html: string | null;
  readonly provider: string | null;
  readonly providerClientId: string | null;
  readonly providerSlotId: string | null;
}

/**
 * Build a renderable creative from nullable database columns.
 *
 * @param fields - Creative columns from `ad_creatives`, null when the row carries none.
 * @returns Validated creative, or null when absent or malformed.
 */
export function toAdCreative(fields: DbCreativeFields | null): AdCreative | null {
  if (fields === null || fields.kind === null) return null;
  const candidate: Record<string, unknown> = { kind: fields.kind };
  if (fields.imageUrl !== null) candidate.imageUrl = fields.imageUrl;
  if (fields.href !== null) candidate.href = fields.href;
  if (fields.altText !== null) candidate.alt = fields.altText;
  if (fields.widthPx !== null) candidate.width = fields.widthPx;
  if (fields.heightPx !== null) candidate.height = fields.heightPx;
  if (fields.html !== null) candidate.html = fields.html;
  if (fields.provider !== null) candidate.provider = fields.provider;
  if (fields.providerClientId !== null) candidate.clientId = fields.providerClientId;
  if (fields.providerSlotId !== null) candidate.slotId = fields.providerSlotId;
  return isAdCreative(candidate) ? candidate : null;
}

function isKnownSlot(slotId: string): slotId is AdSlotId {
  return (AD_SLOT_IDS as readonly string[]).includes(slotId);
}

export interface TenantAdSettingRow {
  readonly slotId: string;
  readonly enabled: boolean;
  readonly creative: DbCreativeFields | null;
}

/**
 * Fold `tenant_ad_settings` rows into tenant overrides; one row wins per slot.
 *
 * @param rows - Scoped settings rows for the active site.
 * @returns Per-slot overrides; unknown slot ids are ignored.
 */
export function mapTenantAdRows(rows: readonly TenantAdSettingRow[]): TenantAdOverrides {
  const overrides: TenantAdOverrides = {};
  for (const row of rows) {
    if (!isKnownSlot(row.slotId)) continue;
    overrides[row.slotId] = { enabled: row.enabled, creative: toAdCreative(row.creative) };
  }
  return overrides;
}

export interface PlacementRow {
  readonly slotId: string;
  readonly templateId: string | null;
  readonly device: string | null;
  readonly creative: DbCreativeFields | null;
}

/**
 * Fold active placement rows into campaign overrides; first row wins per slot.
 *
 * @param rows - Active placements for the site ordered by priority descending.
 * @param templateId - Active template; template-scoped rows for other templates are skipped.
 * @returns Campaign overrides. Device-scoped rows are skipped: the server
 * render has no trustworthy device signal, so serving them would risk a
 * desktop-sized creative on a phone viewport.
 */
export function mapPlacementRows(
  rows: readonly PlacementRow[],
  { templateId }: { readonly templateId: TemplateId },
): CampaignAdOverrides {
  const slots: Partial<Record<AdSlotId, { enabled: boolean; creative: AdCreative | null }>> = {};
  for (const row of rows) {
    if (!isKnownSlot(row.slotId)) continue;
    if (row.device !== null) continue;
    if (row.templateId !== null && row.templateId !== templateId) continue;
    if (slots[row.slotId] !== undefined) continue;
    const creative = toAdCreative(row.creative);
    if (creative === null) continue;
    slots[row.slotId] = { enabled: true, creative };
  }
  return Object.keys(slots).length === 0 ? {} : { slots };
}
