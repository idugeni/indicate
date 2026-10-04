import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import {
  adsAdvertiserDeleteSchema,
  adsAdvertiserSchema,
  adsAdvertiserUpdateSchema,
  adsCampaignDeleteSchema,
  adsCampaignSchema,
  adsCampaignStatusSchema,
  adsCampaignUpdateSchema,
  adsCreativeDeleteSchema,
  adsCreativeSchema,
  adsCreativeStatusSchema,
  adsCreativeUpdateSchema,
  adsCreativeUploadSchema,
  adsPlacementDeleteSchema,
  adsPlacementSchema,
  adsPlacementUpdateSchema,
  adsTenantSettingSchema,
} from '@/modules/ads/ads-schemas';
import { AdsAccessDeniedError, AdsConflictError, AdsNotFoundError, type AdsOverview, type AdsRepository } from '@/modules/ads/ports';
import {
  AdsUploadRejectedError,
  AdsUploadUnavailableError,
  type AdCreativeUploadFile,
  type AdCreativeUploadRepository,
  type AdCreativeUploadStorage,
  uploadAdCreativeImage,
} from '@/modules/ads/ads-upload';

export type AdsAction =
  | 'ads.tenant_setting.save'
  | 'ads.advertiser.create'
  | 'ads.advertiser.update'
  | 'ads.advertiser.delete'
  | 'ads.creative.create'
  | 'ads.creative.update'
  | 'ads.creative.status'
  | 'ads.creative.delete'
  | 'ads.creative.upload'
  | 'ads.campaign.create'
  | 'ads.campaign.update'
  | 'ads.campaign.status'
  | 'ads.campaign.delete'
  | 'ads.placement.create'
  | 'ads.placement.update'
  | 'ads.placement.delete';

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

  async updateAdvertiser(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsAdvertiserUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali perubahan pengiklan.', requestId) };
    try {
      return { ok: true, value: await this.repository.updateAdvertiser(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.advertiser.update', error);
    }
  }

  async deleteAdvertiser(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly deleted: true }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsAdvertiserDeleteSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali hapusan pengiklan.', requestId) };
    try {
      await this.repository.deleteAdvertiser(actor, { ...parsed.data, requestId });
      return { ok: true, value: { deleted: true as const } };
    } catch (error) {
      return this.error(requestId, 'ads.advertiser.delete', error);
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

  async updateCreative(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCreativeUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali perubahan kreatif.', requestId) };
    try {
      return { ok: true, value: await this.repository.updateCreative(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.creative.update', error);
    }
  }

  async deleteCreative(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly deleted: true }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCreativeDeleteSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali hapusan kreatif.', requestId) };
    try {
      await this.repository.deleteCreative(actor, { ...parsed.data, requestId });
      return { ok: true, value: { deleted: true as const } };
    } catch (error) {
      return this.error(requestId, 'ads.creative.delete', error);
    }
  }

  /**
   * Store an uploaded image file as an image creative.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param raw - Upload envelope carrying the file bytes plus text fields.
   * @param storage - R2 write surface with the configured public host.
   * @param requestId - Request id for error envelopes.
   * @returns New creative id with its public image URL.
   */
  async uploadCreativeImage(
    actor: AuthorizedTenantActorContext,
    raw: unknown,
    storage: { readonly storage: AdCreativeUploadStorage; readonly publicHost: string | null } | undefined,
    requestId: string,
  ): Promise<Result<{ readonly id: string; readonly imageUrl: string }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    if (storage === undefined) return this.failure(requestId);
    const envelope = raw as { readonly file?: unknown; readonly campaignId?: unknown; readonly href?: unknown; readonly alt?: unknown } | null;
    const candidate = envelope?.file as { readonly bytes?: unknown; readonly filename?: unknown; readonly contentType?: unknown } | null | undefined;
    const file: AdCreativeUploadFile | null =
      candidate !== null && candidate !== undefined && candidate.bytes instanceof Uint8Array && typeof candidate.filename === 'string' && typeof candidate.contentType === 'string'
        ? { bytes: candidate.bytes, filename: candidate.filename, contentType: candidate.contentType }
        : null;
    if (file === null) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali berkas gambar.', requestId) };
    const parsed = adsCreativeUploadSchema.safeParse({ campaignId: envelope?.campaignId ?? null, href: envelope?.href, alt: envelope?.alt });
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali isian unggahan kreatif.', requestId) };
    const persist = this.repository.createUploadedCreative?.bind(this.repository) as AdCreativeUploadRepository['createUploadedCreative'] | undefined;
    if (persist === undefined) return this.failure(requestId);
    try {
      return {
        ok: true,
        value: await uploadAdCreativeImage({
          actor,
          file,
          fields: { campaignId: parsed.data.campaignId ?? null, href: parsed.data.href, alt: parsed.data.alt },
          repository: { createUploadedCreative: persist },
          storage: storage.storage,
          publicHost: storage.publicHost,
          requestId,
        }),
      };
    } catch (error) {
      if (error instanceof AdsUploadRejectedError) return { ok: false, error: createPublicError('INVALID_INPUT', error.message, requestId) };
      if (error instanceof AdsUploadUnavailableError) return this.failure(requestId);
      return this.error(requestId, 'ads.creative.upload', error);
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

  async updateCampaign(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly version: number }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCampaignUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali perubahan kampanye.', requestId) };
    try {
      return { ok: true, value: await this.repository.updateCampaign(actor, { ...parsed.data, requestId }) };
    } catch (error) {
      return this.error(requestId, 'ads.campaign.update', error);
    }
  }

  async deleteCampaign(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly deleted: true }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsCampaignDeleteSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali hapusan kampanye.', requestId) };
    try {
      await this.repository.deleteCampaign(actor, { ...parsed.data, requestId });
      return { ok: true, value: { deleted: true as const } };
    } catch (error) {
      return this.error(requestId, 'ads.campaign.delete', error);
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

  async deletePlacement(actor: AuthorizedTenantActorContext, raw: unknown, requestId: string): Promise<Result<{ readonly deleted: true }, PublicErrorEnvelope>> {
    const denial = await this.gate(actor);
    if (denial !== null) return { ok: false, error: denial };
    const parsed = adsPlacementDeleteSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali hapusan penempatan.', requestId) };
    try {
      await this.repository.deletePlacement(actor, { ...parsed.data, requestId });
      return { ok: true, value: { deleted: true as const } };
    } catch (error) {
      return this.error(requestId, 'ads.placement.delete', error);
    }
  }
}
