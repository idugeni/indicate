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
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { AD_CREATIVE_UPLOAD_MAX_BYTES } from '@/modules/ads/ads-upload';
import { AdsService } from '@/modules/ads/ads-service';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { resolveAdsAction, statusFor } from './route-helpers';

const querySchema = z.object({ organizationId: z.uuid(), scope: z.enum(['overview']) });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() }).strict();

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
  if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) return handleUpload(request, requestId);
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Perintah iklan tidak valid.', requestId));
  const actor = await actorFor(parsed.data.organizationId, requestId);
  if ('error' in actor) return response(actor);
  try {
    const context = await getServerRuntimeContext();
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const service = new AdsService(new DrizzleAdsRepository(runtime.db));
    const action = resolveAdsAction(service, actor, requestId, parsed.data.action);
    if (action === undefined) return response(createPublicError('INVALID_INPUT', 'Perintah iklan tidak dikenal.', requestId));
    const result = await action(parsed.data.payload);
    if (!result.ok) return response(result.error);
    revalidateTag(`org:${parsed.data.organizationId}`, 'max');
    return NextResponse.json(result.value);
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan iklan tidak tersedia untuk sementara.', requestId));
  }
}

/**
 * Handles the multipart creative upload outside the JSON command path.
 *
 * @param request - Multipart request carrying organization, action, file, and text fields.
 * @param requestId - Request id for error envelopes.
 * @returns Created creative id with its public image URL.
 */
async function handleUpload(request: Request, requestId: string) {
  const form = await request.formData().catch(() => null);
  const organizationId = form?.get('organizationId');
  const action = form?.get('action');
  const file = form?.get('file');
  if (form === null || typeof organizationId !== 'string' || action !== 'ads.creative.upload' || !(file instanceof File)) {
    return response(createPublicError('INVALID_INPUT', 'Perintah iklan tidak valid.', requestId));
  }
  if (file.size === 0 || file.size > AD_CREATIVE_UPLOAD_MAX_BYTES) {
    return response(createPublicError('INVALID_INPUT', 'Ukuran berkas maksimal 5MB.', requestId));
  }
  const actor = await actorFor(organizationId, requestId);
  if ('error' in actor) return response(actor);
  try {
    const context = await getServerRuntimeContext();
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const service = new AdsService(new DrizzleAdsRepository(runtime.db));
    const storage = new R2ObjectStorageAdapter({
      accountId: context.config.r2.accountId,
      bucketName: context.config.r2.bucketName,
      publicBucketName: context.config.r2.publicBucketName,
      accessKeyId: context.config.r2.accessKeyId,
      secretAccessKey: context.config.r2.secretAccessKey,
    });
    const handler = resolveAdsAction(service, actor, requestId, 'ads.creative.upload', { storage, publicHost: context.config.r2.publicHost });
    if (handler === undefined) return response(createPublicError('INVALID_INPUT', 'Perintah iklan tidak dikenal.', requestId));
    const text = (name: string): string | undefined => {
      const value = form.get(name);
      return typeof value === 'string' && value !== '' ? value : undefined;
    };
    const result = await handler({
      file: { bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name, contentType: file.type },
      campaignId: text('campaignId') ?? null,
      href: text('href'),
      alt: text('alt'),
    });
    if (!result.ok) return response(result.error);
    revalidateTag(`org:${organizationId}`, 'max');
    return NextResponse.json(result.value);
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan iklan tidak tersedia untuk sementara.', requestId));
  }
}

export const GET = withApiAccess('GET /api/dashboard/ads', handleGET);
export const POST = withApiAccess('POST /api/dashboard/ads', handlePOST);
