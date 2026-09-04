import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { deliveryComposition } from '@/modules/delivery';
export const dynamic = 'force-dynamic';
async function handleGET(request: Request, { params }: { readonly params: Promise<{ id: string }> }) { const requestId = resolveRequestId(request); const { id } = await params; const result = await (await deliveryComposition()).resolver.classify((await headers()).get('host')); if (result.kind !== 'site') return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } }); const context = await getServerRuntimeContext(); const config = context.config; const runtime = createRuntimeDatabase(context.bootstrap); try { const repository = new DrizzlePublishingRepository(runtime.db); const asset = await repository.authorizePublicMedia(result.context, id, requestId); if (asset === null || asset.state !== 'active') return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } }); const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey }); const authorization = await storage.authorizeExactGet(asset.objectKey, config.r2.readTtlSeconds); return NextResponse.redirect(authorization.url, { status: 307, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } }); } catch { return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } }); } finally { await runtime.close(); } }

export const GET = withApiAccess('GET /api/network/media/[id]', handleGET);
