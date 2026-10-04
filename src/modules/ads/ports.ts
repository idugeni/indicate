import type { AuthorizedTenantActorContext } from '@/core/operation-context';

export class AdsAccessDeniedError extends Error {}
export class AdsConflictError extends Error {}
export class AdsNotFoundError extends Error {}

export interface AdsSiteRow {
  readonly id: string;
  readonly name: string;
  readonly hostname: string;
  readonly templateId: string | null;
}

export interface AdsSlotRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
}

export interface AdsTenantSettingRow {
  readonly siteId: string;
  readonly slotId: string;
  readonly enabled: boolean;
  readonly creativeId: string | null;
  readonly version: number;
  readonly updatedAt: string;
}

export interface AdsAdvertiserRow {
  readonly id: string;
  readonly name: string;
  readonly contactEmail: string | null;
  readonly status: string;
  readonly version: number;
}

export interface AdsCampaignRow {
  readonly id: string;
  readonly advertiserId: string;
  readonly name: string;
  readonly status: string;
  readonly priority: number;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly version: number;
}

export interface AdsCreativeRow {
  readonly id: string;
  readonly campaignId: string | null;
  readonly kind: string;
  readonly imageUrl: string | null;
  readonly href: string | null;
  readonly altText: string | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly html: string | null;
  readonly provider: string | null;
  readonly providerClientId: string | null;
  readonly providerSlotId: string | null;
  readonly status: string;
  readonly version: number;
}

export interface AdsPlacementRow {
  readonly id: string;
  readonly campaignId: string;
  readonly creativeId: string;
  readonly slotId: string;
  readonly siteId: string | null;
  readonly templateId: string | null;
  readonly device: string | null;
  readonly priority: number;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly active: boolean;
  readonly version: number;
}

export interface AdsOverview {
  readonly sites: readonly AdsSiteRow[];
  readonly slots: readonly AdsSlotRow[];
  readonly settings: readonly AdsTenantSettingRow[];
  readonly advertisers: readonly AdsAdvertiserRow[];
  readonly campaigns: readonly AdsCampaignRow[];
  readonly creatives: readonly AdsCreativeRow[];
  readonly placements: readonly AdsPlacementRow[];
}

export interface AdsTenantSettingInput {
  readonly siteId: string;
  readonly slotId: string;
  readonly enabled: boolean;
  readonly creativeId: string | null;
  readonly expectedVersion: number | null;
  readonly requestId: string;
}

export interface AdsAdvertiserInput {
  readonly name: string;
  readonly contactEmail: string | null;
  readonly requestId: string;
}

export interface AdsCreativeInput {
  readonly campaignId: string | null;
  readonly kind: 'image' | 'html' | 'provider';
  readonly imageUrl?: string | undefined;
  readonly href?: string | undefined;
  readonly alt?: string | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly html?: string | undefined;
  readonly provider?: 'adsense' | undefined;
  readonly clientId?: string | undefined;
  readonly slotId?: string | undefined;
  readonly requestId: string;
}

export interface AdsCreativeStatusInput {
  readonly id: string;
  readonly status: 'active' | 'inactive' | 'archived';
  readonly expectedVersion: number;
  readonly requestId: string;
}

export interface AdsCampaignInput {
  readonly advertiserId: string;
  readonly name: string;
  readonly status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
  readonly priority: number;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly requestId: string;
}

export interface AdsCampaignStatusInput {
  readonly id: string;
  readonly status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
  readonly expectedVersion: number;
  readonly requestId: string;
}

export interface AdsPlacementInput {
  readonly campaignId: string;
  readonly creativeId: string;
  readonly slotId: string;
  readonly siteId: string | null;
  readonly templateId: string | null;
  readonly device: string | null;
  readonly priority: number;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly requestId: string;
}

export interface AdsPlacementUpdateInput {
  readonly id: string;
  readonly active?: boolean | undefined;
  readonly priority?: number | undefined;
  readonly startsAt?: string | null | undefined;
  readonly endsAt?: string | null | undefined;
  readonly expectedVersion: number;
  readonly requestId: string;
}

/**
 * Persistence boundary for dashboard ad management.
 *
 * @remarks Every method runs tenant-scoped: implementations set the RLS
 * tenant context from the actor and constrain writes by organization id.
 * Version-checked writes throw `AdsConflictError` on stale reads.
 */
export interface AdsRepository {
  overview(actor: AuthorizedTenantActorContext): Promise<AdsOverview>;
  saveTenantSetting(actor: AuthorizedTenantActorContext, input: AdsTenantSettingInput): Promise<{ readonly version: number }>;
  createAdvertiser(actor: AuthorizedTenantActorContext, input: AdsAdvertiserInput): Promise<{ readonly id: string }>;
  createCreative(actor: AuthorizedTenantActorContext, input: AdsCreativeInput): Promise<{ readonly id: string }>;
  updateCreativeStatus(actor: AuthorizedTenantActorContext, input: AdsCreativeStatusInput): Promise<{ readonly version: number }>;
  createCampaign(actor: AuthorizedTenantActorContext, input: AdsCampaignInput): Promise<{ readonly id: string }>;
  updateCampaignStatus(actor: AuthorizedTenantActorContext, input: AdsCampaignStatusInput): Promise<{ readonly version: number }>;
  createPlacement(actor: AuthorizedTenantActorContext, input: AdsPlacementInput): Promise<{ readonly id: string }>;
  updatePlacement(actor: AuthorizedTenantActorContext, input: AdsPlacementUpdateInput): Promise<{ readonly version: number }>;
}
