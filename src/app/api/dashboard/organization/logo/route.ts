import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { resolveRequestId } from '@/core/observability/request-id';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { media, organizations, publishers } from '@/data/schema';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { withApiAccess } from '@/core/observability/api-access';

const querySchema = z.object({ organizationId: z.uuid(), mediaId: z.uuid() });

function recordOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstText(...values: readonly unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get('organizationId'),
    mediaId: url.searchParams.get('mediaId'),
  });
  if (!parsed.success) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const actor = await authorizeDashboardOrganization(runtime.db, user, parsed.data.organizationId, requestId);
  if (actor === null) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  try {
    const asset = await runtime.db.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${requestId})`);
      const organizationsFound = await transaction.select({
        name: organizations.name,
        identityData: sql<unknown>`${organizations.customerMetadata} -> 'organizationIdentity'`,
      }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1);
      const organization = organizationsFound[0];
      if (organization === undefined) return null;

      const candidates = await transaction.select({
        name: publishers.name,
        contacts: publishers.contacts,
      }).from(publishers)
        .where(and(eq(publishers.organizationId, actor.organizationId), eq(publishers.status, 'active')))
        .orderBy(sql`CASE WHEN lower(${publishers.name}) = lower(${organization.name}) THEN 0 ELSE 1 END`, asc(publishers.name))
        .limit(2);
      const publisher = candidates.find((item) => item.name.toLowerCase() === organization.name.toLowerCase())
        ?? (candidates.length === 1 ? candidates[0] : undefined);
      const identity = recordOf(organization.identityData);
      const identityLogo = identity.logoUrl;
      const effectiveLogo = identityLogo === ''
        ? ''
        : firstText(identityLogo, recordOf(publisher?.contacts).logoUrl) ?? '';
      if (effectiveLogo !== `/api/network/media/${parsed.data.mediaId}`) return null;

      const rows = await transaction.select({ objectKey: media.objectKey })
        .from(media)
        .where(and(
          eq(media.organizationId, actor.organizationId),
          eq(media.id, parsed.data.mediaId),
          eq(media.state, 'active'),
          eq(media.organizationAsset, true),
          eq(media.purpose, 'organization-asset'),
        ))
        .limit(1);
      return rows[0] ?? null;
    });
    if (asset === null) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

    const storage = new R2ObjectStorageAdapter({
      accountId: context.config.r2.accountId,
      bucketName: context.config.r2.bucketName,
      publicBucketName: context.config.r2.publicBucketName,
      accessKeyId: context.config.r2.accessKeyId,
      secretAccessKey: context.config.r2.secretAccessKey,
    });
    const authorization = await storage.authorizeExactGet(asset.objectKey, context.config.r2.readTtlSeconds);
    return NextResponse.redirect(authorization.url, {
      status: 307,
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const GET = withApiAccess('GET /api/dashboard/organization/logo', handleGET, { accessLog: 'errors-only' });
