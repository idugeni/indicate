import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { PUBLISHING_PERMISSIONS } from '@/modules/publishing/permissions';
import { checkShareUrl } from '@/modules/publishing/share-readiness';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDeliveryRepository } from '@/data/repos/delivery';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

const querySchema = z.object({ organizationId: z.uuid(), url: z.string().min(1).max(2048) });

/**
 * Nilai kesiapan bagikan satu URL tayang untuk pratinjau WA/FB.
 *
 * @param request - GET dengan `organizationId` dan `url` https milik tenant.
 * @returns Kesiapan `ready` plus alasan dan hasil cek per tahap.
 */
async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get('organizationId'),
    url: url.searchParams.get('url'),
  });
  if (!parsed.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return NextResponse.json(createPublicError('UNAUTHENTICATED', 'Sesi berakhir. Muat ulang lalu masuk kembali.', requestId), { status: 401 });
  const actor = await authorizeDashboardOrganization(runtime.db, user, parsed.data.organizationId, requestId);
  if (actor === null || !actor.permissionSet.has(PUBLISHING_PERMISSIONS.publishingRead)) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }
  let target: URL;
  try {
    target = new URL(parsed.data.url);
  } catch {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }
  if (target.protocol !== 'https:') return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const delivery = new DrizzleDeliveryRepository(runtime.db, context.config.seo.defaultAssetUrl, context.config.r2.publicHost);
  const hosts = await delivery.findActiveSitesByExactHostname(target.hostname.toLowerCase()).catch(() => []);
  if (!hosts.some((host) => host.organizationId === parsed.data.organizationId)) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }
  const readiness = await checkShareUrl(target.toString());
  return NextResponse.json(readiness, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const GET = withApiAccess('GET /api/dashboard/share-readiness', handleGET, { accessLog: 'errors-only' });
