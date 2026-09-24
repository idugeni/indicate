import 'server-only';

import { NextResponse } from 'next/server';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { deliveryComposition } from '@/modules/delivery';
import { resolveRequestId } from '@/core/observability/request-id';

const BRAND_CACHE_CONTROL = 'public, max-age=86400, s-maxage=31536000, immutable';

function faviconIdFromUrl(value: string | null): string | null {
  if (value === null) return null;
  const match = /\/api\/network\/media\/([0-9a-f-]{36})/u.exec(value);
  return match?.[1] ?? null;
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Serve the tenant favicon as stable immutable bytes under a same-host path.
 *
 * @param request - Incoming request carrying the tenant hostname headers.
 * @returns 200 PNG bytes with year-long edge cache, or 404 for unknown hosts and sites without a custom icon.
 * @remarks Replaces the signed `/api/network/media` redirect for crawler-facing `<link rel="icon">`: Googlebot-Image needs a stable crawlable URL outside `Disallow: /api/`. Regional sites inherit the apex icon through the shell, so no per-region upload exists. Non-site hosts 404: control-plane chrome keeps using `/favicon.ico` + `/apple-icon.png`.
 */
export async function serveBrandIcon(request: Request): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const composition = await deliveryComposition();
  const classification = await composition.resolver.classify(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
  );
  if (classification.kind !== 'site') return notFound();
  const shell = await composition.repository.loadSiteShell(classification.context);
  const mediaId = faviconIdFromUrl(shell?.settings.faviconUrl ?? null);
  if (shell === null || mediaId === null) return notFound();
  const context = await getServerRuntimeContext();
  const config = context.config;
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  try {
    const repository = new DrizzlePublishingRepository(runtime.db);
    const asset = await repository.authorizePublicMedia(classification.context, mediaId, requestId);
    if (asset === null || asset.state !== 'active') return notFound();
    const storage = new R2ObjectStorageAdapter({
      accountId: config.r2.accountId,
      bucketName: config.r2.bucketName,
      publicBucketName: config.r2.publicBucketName,
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    });
    const stored = await storage.getExact(asset.objectKey);
    if (stored === null) return notFound();
    const bytes = new Uint8Array(stored.body.byteLength);
    bytes.set(stored.body);
    return new NextResponse(bytes.buffer, {
      status: 200,
      headers: {
        'Content-Type': stored.contentType,
        'Cache-Control': BRAND_CACHE_CONTROL,
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return notFound();
  }
}
