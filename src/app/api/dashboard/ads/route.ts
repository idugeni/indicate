import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAdsRepository } from '@/data/repos/ads';
import { AdsService } from '@/modules/ads/ads-service';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const querySchema = z.object({ organizationId: z.uuid(), scope: z.enum(['overview']) });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() }).strict();

/**
 * Maps an ads envelope to its HTTP status.
 *
 * @param error - Envelope produced by `AdsService` or denial helpers.
 * @returns Status code defaulting to 500 for non-disclosing denials.
 */
export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
function response(error: PublicErrorEnvelope) {
  return NextResponse.json(error, { status: statusFor(error) });
}

async function actorFor(organizationId: string, requestId: string): Promise<AuthorizedTenantActorContext | PublicErrorEnvelope> {
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return createNonDisclosingDenial(requestId);
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null) return createNonDisclosingDenial(requestId);
  return actor;
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ organizationId: url.searchParams.get('organizationId'), scope: url.searchParams.get('scope') });
  if (!parsed.success) return response(createNonDisclosingDenial(requestId));
  const actor = await actorFor(parsed.data.organizationId, requestId);
  if ('error' in actor) return response(actor);
  try {
    const context = await getServerRuntimeContext();
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const service = new AdsService(new DrizzleAdsRepository(runtime.db));
    const result = await service.overview(actor);
    return result.ok ? NextResponse.json(result.value) : response(result.error);
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan iklan tidak tersedia untuk sementara.', requestId));
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return response(createNonDisclosingDenial(requestId));
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Perintah iklan tidak valid.', requestId));
  const actor = await actorFor(parsed.data.organizationId, requestId);
  if ('error' in actor) return response(actor);
  try {
    const context = await getServerRuntimeContext();
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const service = new AdsService(new DrizzleAdsRepository(runtime.db));
    const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'ads.tenant_setting.save': (payload) => service.saveTenantSetting(actor, payload, requestId),
      'ads.advertiser.create': (payload) => service.createAdvertiser(actor, payload, requestId),
      'ads.creative.create': (payload) => service.createCreative(actor, payload, requestId),
      'ads.creative.status': (payload) => service.updateCreativeStatus(actor, payload, requestId),
      'ads.campaign.create': (payload) => service.createCampaign(actor, payload, requestId),
      'ads.campaign.status': (payload) => service.updateCampaignStatus(actor, payload, requestId),
      'ads.placement.create': (payload) => service.createPlacement(actor, payload, requestId),
      'ads.placement.update': (payload) => service.updatePlacement(actor, payload, requestId),
    };
    const action = actions[parsed.data.action];
    if (action === undefined) return response(createPublicError('INVALID_INPUT', 'Perintah iklan tidak dikenal.', requestId));
    const result = await action(parsed.data.payload);
    if (!result.ok) return response(result.error);
    revalidateTag(`org:${parsed.data.organizationId}`, 'max');
    return NextResponse.json(result.value);
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan iklan tidak tersedia untuk sementara.', requestId));
  }
}

export const GET = withApiAccess('GET /api/dashboard/ads', handleGET);
export const POST = withApiAccess('POST /api/dashboard/ads', handlePOST);
