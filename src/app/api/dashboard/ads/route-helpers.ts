import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import type { AdCreativeUploadStorage } from '@/modules/ads/ads-upload';
import type { AdsService } from '@/modules/ads/ads-service';

export interface AdsUploadDeps {
  readonly storage: AdCreativeUploadStorage;
  readonly publicHost: string | null;
}

/** Resolve an ads command to its service handler. */
export function resolveAdsAction(
  service: AdsService,
  actor: AuthorizedTenantActorContext,
  requestId: string,
  action: string,
  uploadDeps?: AdsUploadDeps | undefined,
): ((payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>) | undefined {
  const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
    'ads.tenant_setting.save': (payload) => service.saveTenantSetting(actor, payload, requestId),
    'ads.network_setting.save': (payload) => service.saveNetworkSlot(actor, payload, requestId),
    'ads.advertiser.create': (payload) => service.createAdvertiser(actor, payload, requestId),
    'ads.advertiser.update': (payload) => service.updateAdvertiser(actor, payload, requestId),
    'ads.advertiser.delete': (payload) => service.deleteAdvertiser(actor, payload, requestId),
    'ads.creative.create': (payload) => service.createCreative(actor, payload, requestId),
    'ads.creative.update': (payload) => service.updateCreative(actor, payload, requestId),
    'ads.creative.status': (payload) => service.updateCreativeStatus(actor, payload, requestId),
    'ads.creative.delete': (payload) => service.deleteCreative(actor, payload, requestId),
    'ads.creative.upload': (payload) => service.uploadCreativeImage(actor, payload, uploadDeps, requestId),
    'ads.campaign.create': (payload) => service.createCampaign(actor, payload, requestId),
    'ads.campaign.update': (payload) => service.updateCampaign(actor, payload, requestId),
    'ads.campaign.status': (payload) => service.updateCampaignStatus(actor, payload, requestId),
    'ads.campaign.delete': (payload) => service.deleteCampaign(actor, payload, requestId),
    'ads.placement.create': (payload) => service.createPlacement(actor, payload, requestId),
    'ads.placement.update': (payload) => service.updatePlacement(actor, payload, requestId),
    'ads.placement.delete': (payload) => service.deletePlacement(actor, payload, requestId),
  };
  return actions[action];
}

export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
