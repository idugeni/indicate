import { headers } from 'next/headers';
import { connection, NextResponse } from 'next/server';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { isPublicObjectKey } from '@/modules/publishing/object-key';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { deliveryComposition } from '@/modules/delivery';

const SITE_DEFAULT_CACHE_CONTROL = 'public, max-age=0, s-maxage=31536000, immutable';

async function handleGET(request: Request, { params }: { readonly params: Promise<{ id: string }> }) {
  await connection();
  const requestId = resolveRequestId(request);
  const { id } = await params;
  const incoming = await headers();
  const result = await (await deliveryComposition()).resolver.classify(incoming.get('x-forwarded-host') ?? incoming.get('host'));
  if (result.kind !== 'site') return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const context = await getServerRuntimeContext();
  const config = context.config;
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  try {
    const repository = new DrizzlePublishingRepository(runtime.db);
    const asset = await repository.authorizePublicMedia(result.context, id, requestId);
    if (asset === null || asset.state !== 'active') return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, publicBucketName: config.r2.publicBucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
    const objectKey = new URL(request.url).searchParams.get('variant') === 'thumb' ? asset.thumbObjectKey : asset.objectKey;
    if (objectKey === null) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    if (asset.purpose === 'site-default') {
      const stored = await storage.getExact(objectKey);
      if (stored === null) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
      const bytes = new Uint8Array(stored.body.byteLength);
      bytes.set(stored.body);
      return new NextResponse(bytes.buffer, {
        status: 200,
        headers: { 'Content-Type': stored.contentType, 'Cache-Control': SITE_DEFAULT_CACHE_CONTROL, 'Referrer-Policy': 'no-referrer' },
      });
    }
    if (config.r2.publicHost !== null && isPublicObjectKey(objectKey)) return NextResponse.redirect(`https://${config.r2.publicHost}/${objectKey}`, { status: 307, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=60', 'Referrer-Policy': 'no-referrer' } });
    const authorization = await storage.authorizeExactGet(objectKey, config.r2.readTtlSeconds);
    const redirectTtlSeconds = Math.max(1, config.r2.readTtlSeconds - 10);
    return NextResponse.redirect(authorization.url, { status: 307, headers: { 'Cache-Control': `public, max-age=0, s-maxage=${redirectTtlSeconds}, stale-while-revalidate=60`, 'Referrer-Policy': 'no-referrer' } });
  } catch {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
}

/**
 * Serve the per-host media redirect.
 *
 * @remarks Stays dynamic per request because of per-host media authorization + DB; replacement for force-dynamic.
 * Public-bucket keys redirect straight to the immutable public URL (year-long
 * edge cache); private keys keep the signed redirect whose TTL derives from
 * the signature lifetime (`readTtlSeconds` − 10s margin) so an edge-cached
 * redirect never outlives the R2 signature. 60s SWR absorbs concurrent
 * revalidation bursts; stale frames inside it may carry an expired presigned
 * URL until background revalidation finishes. `site-default` cards (tenant OG
 * images) are proxied as bytes instead: their keys are unique per upload,
 * and scrapers must never meet an expired signature. The `Cache-Control` this
 * route sets wins over the global `/api/:path*` no-store rule in
 * `next.config.ts`; Vercel strips `s-maxage` when handing the response to the
 * browser, so the edge sees `public, max-age=0, immutable` and scrapers always
 * get a 200 rather than a signature that expired mid-crawl.
 * Stability (always-200 bytes) holds either way.
 */
export const GET = withApiAccess('GET /api/network/media/[id]', handleGET, { accessLog: 'errors-only' });
