import { normalizeTemplateId, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';

import { AD_SLOT_IDS, type AdSlotId } from '@/modules/ads/slots';
import { TEMPLATE_AD_MAP } from '@/modules/ads/placement-map';
import { isAdCreative, type AdCreative } from '@/modules/ads/creatives';

/**
 * Per-slot tenant override: disabling a slot or pinning a creative.
 *
 * @remarks
 * Carried inside `site_settings.seo.ads` (one tenant-isolated row per site,
 * already covered by the `site:`/`org:` cache tags), so no migration or new
 * table is needed for this stage. The graduation path is a dedicated
 * `tenant_ad_settings` table; only `parseTenantAdOverrides` changes then.
 */
export interface AdSlotOverride {
  readonly enabled?: boolean | undefined;
  readonly creative?: AdCreative | null | undefined;
}

export type TenantAdOverrides = Partial<Record<AdSlotId, AdSlotOverride>>;

export interface CampaignAdOverrides {
  readonly slots?: Partial<Record<AdSlotId, AdSlotOverride>> | undefined;
}

export interface ResolvedAdSlot {
  readonly slot: AdSlotId;
  readonly mapped: boolean;
  readonly enabled: boolean;
  readonly creative: AdCreative | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSlotOverride(value: unknown): AdSlotOverride | null {
  if (!isRecord(value)) return null;
  const override: AdSlotOverride = {};
  if (typeof value.enabled === 'boolean') {
    return { ...override, enabled: value.enabled, ...(value.creative === undefined ? {} : parseCreativeField(value.creative)) };
  }
  if (value.creative === undefined) return null;
  const creative = parseCreativeField(value.creative);
  return Object.keys(creative).length === 0 ? null : { ...override, ...creative };
}

function parseCreativeField(value: unknown): { readonly creative?: AdCreative | null | undefined } {
  if (value === null) return { creative: null };
  if (isAdCreative(value)) return { creative: value };
  return {};
}

/**
 * Read tenant ad overrides from the site's `seo` bag without throwing.
 *
 * @param seo - Raw `site_settings.seo` JSON for the active site.
 * @returns Validated per-slot overrides; `{}` when absent or malformed.
 */
export function parseTenantAdOverrides(seo: unknown): TenantAdOverrides {
  if (!isRecord(seo) || !isRecord(seo.ads)) return {};
  const overrides: TenantAdOverrides = {};
  for (const slot of AD_SLOT_IDS) {
    const parsed = parseSlotOverride(seo.ads[slot]);
    if (parsed !== null) overrides[slot] = parsed;
  }
  return overrides;
}

/**
 * Resolve the template id carried by the site without throwing.
 *
 * @param templateId - Raw `site.settings.colors.templateId`.
 * @returns The template id, or null when the site carries an unknown value.
 */
export function safeTemplateId(templateId: unknown): TemplateId | null {
  try {
    return normalizeTemplateId(templateId);
  } catch {
    return null;
  }
}

/**
 * Check whether a template exposes a slot in any of its zones.
 *
 * @param templateId - Active template of the site.
 * @param slot - Semantic slot to check.
 * @returns True when the template maps the slot.
 */
export function isSlotMapped(templateId: TemplateId, slot: AdSlotId): boolean {
  const zones = TEMPLATE_AD_MAP[templateId];
  return (
    zones.header.includes(slot) ||
    zones.top.includes(slot) ||
    zones.listing.includes(slot) ||
    zones.article.includes(slot) ||
    zones.channel.includes(slot) ||
    zones.footer.includes(slot)
  );
}

/**
 * Resolve one slot through Global Default → Template Default → Tenant
 * Override → Campaign Override.
 *
 * @param templateId - Active template of the site.
 * @param overrides - Validated tenant overrides from the site settings.
 * @param slot - Semantic slot to resolve.
 * @param campaign - Optional campaign override with the highest precedence.
 * @returns Mapping, enablement, and the winning creative (null = fallback).
 * @remarks Slots are OFF unless explicitly enabled: the dashboard switch
 * (tenant overrides) or an active campaign placement opts in. Only the
 * default with no operator action anywhere stays dark.
 */
export function resolveAdSlot({
  templateId,
  overrides,
  slot,
  campaign,
}: {
  readonly templateId: TemplateId;
  readonly overrides: TenantAdOverrides;
  readonly slot: AdSlotId;
  readonly campaign?: CampaignAdOverrides | undefined;
}): ResolvedAdSlot {
  const mapped = isSlotMapped(templateId, slot);
  if (!mapped) return { slot, mapped, enabled: false, creative: null };
  const tenant = overrides[slot];
  const override = campaign?.slots?.[slot];
  const enabled = override?.enabled ?? tenant?.enabled ?? false;
  const creative = override?.creative ?? tenant?.creative ?? null;
  return { slot, mapped, enabled, creative: creative ?? null };
}
