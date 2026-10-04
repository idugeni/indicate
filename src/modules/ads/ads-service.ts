import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import {
  adsAdvertiserSchema,
  adsCampaignSchema,
  adsCampaignStatusSchema,
  adsCreativeSchema,
  adsCreativeStatusSchema,
  adsPlacementSchema,
  adsPlacementUpdateSchema,
  adsTenantSettingSchema,
} from '@/modules/ads/ads-schemas';
import { AdsAccessDeniedError, AdsConflictError, AdsNotFoundError, type AdsOverview, type AdsRepository } from '@/modules/ads/ports';

export type AdsAction =
  | 'ads.tenant_setting.save'
  | 'ads.advertiser.create'
  | 'ads.creative.create'
  | 'ads.creative.status'
  | 'ads.campaign.create'
  | 'ads.campaign.status'
  | 'ads.placement.create'
  | 'ads.placement.update';

/**
 * Dashboard application service for ad management.
 *
 * @remarks Gated on the existing `site.manage` tenant grant: ad placement is
 * the same sensitivity class as the site presentation settings that grant
 * already covers, so no new permission string (and no role backfill
 * migration) is needed. A dedicated `ads.manage` grant is the graduation
 * path when ad ops separates from site ops.
 */
export class AdsService {
  constructor(private readonly repository: AdsRepository) {}

  private async gate(actor: AuthorizedTenantActorContext): Promise<PublicErrorEnvelope | null> {
    if (!actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteManage)) {
      return createNonDisclosingDenial(actor.requestId);
    }
    return null;
  }

  private failure(requestId: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan iklan tidak tersedia untuk sementara.', requestId) };
  }

  private error(requestId: string, action: string, error: unknown): Result<never, PublicErrorEnvelope> {
    if (error instanceof AdsAccessDeniedError) return { ok: false, error: createNonDisclosingDenial(requestId) };
    if (error instanceof AdsNotFoundError) return { ok: false, error: createPublicError('RESOURCE_UNAVAILABLE', `Data iklan tidak ditemukan untuk ${action}.`, requestId) };
    if (error instanceof AdsConflictError) return { ok: false, error: createPublicError('CONFLICT', 'Data berubah oleh orang lain. Muat ulang lalu coba lagi.', requestId) };
    return this.failure(requestId);
  }

  async overview(actor: AuthorizedTenantActorContext): Promise<Result<AdsOverview, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    try {
      return { ok: true, value: await this.repository.overview(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'ads.overview', error);
    }
  }

  async saveTenantSetting(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsTenantSettingSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali isian slot situs.', requestId) };
    try {
      return { ok: true, value: await this.repository.saveTenantSetting(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.tenant_setting.save', error);
    }
  }

  async createAdvertiser(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsAdvertiserSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali isian pengiklan.', requestId) };
    try {
      return { ok: true, value: await this.repository.createAdvertiser(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.advertiser.create', error);
    }
  }

  async createCreative(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCreativeSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali isian kreatif.', requestId) };
    try {
      return { ok: true, value: await this.repository.createCreative(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.creative.create', error);
    }
  }

  async updateCreativeStatus(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCreativeStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali status kreatif.', requestId) };
    try {
      return { ok: true, value: await this.repository.updateCreativeStatus(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.creative.status', error);
    }
  }

  async createCampaign(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCampaignSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali isian kampanye.', requestId) };
    try {
      return { ok: true, value: await this.repository.createCampaign(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.campaign.create', error);
    }
  }

  async updateCampaignStatus(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCampaignStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali status kampanye.', requestId) };
    try {
      return { ok: true, value: await this.repository.updateCampaignStatus(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.campaign.status', error);
    }
  }

  async createPlacement(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsPlacementSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali isian penempatan.', requestId) };
    try {
      return { ok: true, value: await this.repository.createPlacement(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.placement.create', error);
    }
  }

  async updatePlacement(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsPlacementUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali perubahan penempatan.', requestId) };
    try {
      return { ok: true, value: await this.repository.updatePlacement(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.placement.update', error);
    }
  }
}
