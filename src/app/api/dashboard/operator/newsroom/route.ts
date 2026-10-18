import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import {
  authenticateDashboardUser,
  authorizeDashboardOrganization,
} from '@/modules/auth/authenticate-dashboard';
import { MediaService } from '@/modules/publishing/media-service';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';

const imageSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    /** Base64-encoded image bytes; decoded and re-encoded server-side before R2 upload. */
    dataBase64: z.string().min(16).max(18_000_000),
    altText: z.string().trim().min(1).max(300),
    caption: z.string().trim().max(500).optional(),
  })
  .strict();

const requestSchema = z
  .object({
    organizationId: z.uuid(),
    title: z.string().trim().min(1).max(300),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    body: z.string().trim().min(1).max(200_000),
    excerpt: z.string().trim().min(1).max(500).optional(),
    regionId: z.uuid().nullable().optional(),
    publisherId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    categoryIds: z.array(z.uuid()).max(10).optional(),
    authorId: z.uuid().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    status: z.enum(['draft', 'in_review']).default('draft'),
    cover: imageSchema.optional(),
  })
  .strict();

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request))
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });

  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      createPublicError('INVALID_INPUT', 'Data berita atau gambar tidak valid.', requestId),
      { status: 400 },
    );

  const runtimeContext = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(runtimeContext.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, await cookies(), requestId);
  if (user === null)
    return NextResponse.json(
      createPublicError('UNAUTHENTICATED', 'Sesi berakhir. Silakan masuk kembali.', requestId),
      { status: 401 },
    );

  const actor = await authorizeDashboardOrganization(
    runtime.db,
    user,
    parsed.data.organizationId,
    requestId,
  );
  if (actor === null || actor.actorType !== 'user')
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  if (!actor.permissionSet.has('article.manage'))
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });

  const repository = new DrizzlePublishingRepository(runtime.db);
  const storage = new R2ObjectStorageAdapter({
    accountId: runtimeContext.config.r2.accountId,
    bucketName: runtimeContext.config.r2.bucketName,
    publicBucketName: runtimeContext.config.r2.publicBucketName,
    accessKeyId: runtimeContext.config.r2.accessKeyId,
    secretAccessKey: runtimeContext.config.r2.secretAccessKey,
  });
  const media = new MediaService(repository, storage, new UuidGenerator(), {
    maxBytes: runtimeContext.config.r2.maxBytes,
    allowedTypes: runtimeContext.config.r2.allowedTypes,
    uploadTtlSeconds: runtimeContext.config.r2.uploadTtlSeconds,
    readTtlSeconds: runtimeContext.config.r2.readTtlSeconds,
  });

  let leadMediaId: string | null = null;
  let mediaVersion = 1;
  if (parsed.data.cover !== undefined) {
    const { default: sharp } = await import('sharp');
    const input = parsed.data.cover;
    const sourceBytes = Buffer.from(input.dataBase64, 'base64');
    if (sourceBytes.length === 0 || sourceBytes.length > runtimeContext.config.r2.maxBytes) {
      return NextResponse.json(
        createPublicError(
          'INVALID_INPUT',
          'Ukuran gambar melewati batas yang diizinkan.',
          requestId,
        ),
        { status: 400 },
      );
    }
    const metadata = await sharp(sourceBytes, { limitInputPixels: 40_000_000 })
      .metadata()
      .catch(() => null);
    if (
      metadata === null ||
      metadata.width === undefined ||
      metadata.height === undefined ||
      metadata.width < 1 ||
      metadata.height < 1
    ) {
      return NextResponse.json(
        createPublicError('INVALID_INPUT', 'Berkas bukan gambar yang valid.', requestId),
        { status: 400 },
      );
    }
    const preferredType = runtimeContext.config.r2.allowedTypes.includes('image/webp')
      ? 'image/webp'
      : 'image/jpeg';
    if (!runtimeContext.config.r2.allowedTypes.includes(preferredType)) {
      return NextResponse.json(
        createPublicError(
          'DEPENDENCY_UNAVAILABLE',
          'Konfigurasi R2 tidak mengizinkan format gambar hasil kompresi.',
          requestId,
        ),
        { status: 503 },
      );
    }
    const pipeline = sharp(sourceBytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
    const optimized =
      preferredType === 'image/webp'
        ? await pipeline.webp({ quality: 82, effort: 4 }).toBuffer()
        : await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    if (optimized.length === 0 || optimized.length > runtimeContext.config.r2.maxBytes) {
      return NextResponse.json(
        createPublicError(
          'INVALID_INPUT',
          'Gambar hasil kompresi masih melewati batas ukuran.',
          requestId,
        ),
        { status: 400 },
      );
    }
    const checksum = createHash('sha256').update(optimized).digest('base64');
    const reservation = await media.reserveUpload(actor, {
      filename:
        input.filename.replace(/\.[^.]+$/, '') +
        (preferredType === 'image/webp' ? '.webp' : '.jpg'),
      mediaType: preferredType,
      sizeBytes: optimized.length,
      checksum,
      purpose: 'article-cover',
      owner: { kind: 'organization' },
    });
    if (!reservation.ok) return NextResponse.json(reservation.error, { status: 400 });

    try {
      await storage.putExact(reservation.value.objectKey, optimized, preferredType);
    } catch {
      return NextResponse.json(
        createPublicError(
          'DEPENDENCY_UNAVAILABLE',
          'Gagal mengunggah gambar ke Cloudflare R2.',
          requestId,
        ),
        { status: 503 },
      );
    }
    const completed = await media.completeUpload(actor, {
      reservationId: reservation.value.reservationId,
      widthPx: Math.min(
        30_000,
        Math.round(metadata.width * Math.min(1, 2000 / Math.max(metadata.width, metadata.height))),
      ),
      heightPx: Math.min(
        30_000,
        Math.round(metadata.height * Math.min(1, 2000 / Math.max(metadata.width, metadata.height))),
      ),
      altText: input.altText,
      ...(input.caption === undefined || input.caption.trim() === ''
        ? {}
        : { caption: input.caption }),
    });
    if (!completed.ok) return NextResponse.json(completed.error, { status: 400 });
    leadMediaId = completed.value.id;
    mediaVersion = completed.value.version;
  }

  const service = new TenantBusinessService(
    new DrizzleDashboardRepository(runtime.db),
    new UuidGenerator(),
  );
  const created = await service.createArticle(actor, {
    regionId: parsed.data.regionId ?? null,
    slug: parsed.data.slug,
    title: parsed.data.title,
    body: parsed.data.body,
    excerpt: parsed.data.excerpt ?? null,
    publisherId: parsed.data.publisherId ?? null,
    categoryId: parsed.data.categoryId ?? parsed.data.categoryIds?.[0] ?? null,
    categoryIds:
      parsed.data.categoryIds ?? (parsed.data.categoryId ? [parsed.data.categoryId] : []),
    authorId: parsed.data.authorId ?? null,
    tags: parsed.data.tags ?? [],
    leadMediaId,
    status: parsed.data.status,
    ownerOrganizationId: parsed.data.organizationId,
  });
  if (!created.ok) {
    if (leadMediaId !== null) {
      await media
        .archive(actor, { mediaId: leadMediaId, expectedVersion: mediaVersion })
        .catch(() => undefined);
    }
    const code = created.error.error.code;
    const status =
      code === 'FORBIDDEN' ? 403 : code === 'CONFLICT' ? 409 : code === 'INVALID_INPUT' ? 400 : 503;
    return NextResponse.json(created.error, { status });
  }

  logEvent('info', {
    event: 'ai_operator.newsroom.article_created',
    requestId,
    context: {
      actorId: actor.actorId,
      organizationId: actor.organizationId,
      articleId: created.value.id,
      hasCover: leadMediaId !== null,
      imageOptimization: leadMediaId === null ? null : 'sharp-webp-or-jpeg',
    },
  });
  return NextResponse.json(
    {
      article: {
        id: created.value.id,
        organizationId: created.value.organizationId,
        title: created.value.title,
        slug: created.value.slug,
        status: created.value.status,
        leadMediaId: created.value.leadMediaId,
      },
      media:
        leadMediaId === null
          ? null
          : { id: leadMediaId, storage: 'cloudflare-r2', optimized: true },
      requestId,
    },
    { status: 201 },
  );
}

export const POST = withApiAccess('POST /api/dashboard/operator/newsroom', handlePOST);
