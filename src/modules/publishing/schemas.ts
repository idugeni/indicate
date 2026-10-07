import { z } from 'zod';

import { MEDIA_PURPOSES } from '@/modules/publishing/object-key';

const mediaOwnerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('article'), articleId: z.uuid() }).strict(),
  z.object({ kind: z.literal('site'), siteId: z.uuid() }).strict(),
  z.object({ kind: z.literal('organization') }).strict(),
]);

const checksumField = z.string().trim().regex(/^[A-Za-z0-9+/]{43}=$/, 'Expected a base64-encoded SHA-256 checksum.');

export const mediaReservationSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mediaType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  checksum: checksumField,
  purpose: z.enum(MEDIA_PURPOSES),
  owner: mediaOwnerSchema,
  /**
   * Org pemilik berkas; bila diisi dan berbeda dari org aktif, pemanggil wajib
   * membawa grant platform super_admin (kreasi atas nama org).
   */
  ownerOrganizationId: z.uuid().nullish(),
  thumb: z.object({
    mediaType: z.string().trim().min(1).max(100),
    sizeBytes: z.number().int().positive(),
    checksum: checksumField,
  }).strict().optional(),
}).strict();

export const mediaCompletionSchema = z.object({
  reservationId: z.uuid(),
  /** Wajib diisi saat reservasi dibuat untuk org lain; harus cocok dengan baris reservasi. */
  ownerOrganizationId: z.uuid().nullish(),
  thumb: z.object({
    sizeBytes: z.number().int().positive(),
    checksum: checksumField,
  }).strict().optional(),
  widthPx: z.number().int().min(1).max(30000).optional(),
  heightPx: z.number().int().min(1).max(30000).optional(),
  altText: z.string().trim().min(1).max(300).optional(),
  caption: z.string().trim().min(1).max(500).optional(),
  sortOrder: z.number().int().min(0).max(1000000).optional(),
  focalX: z.number().int().min(0).max(100).optional(),
  focalY: z.number().int().min(0).max(100).optional(),
}).strict()
  .refine((value) => (value.widthPx === undefined) === (value.heightPx === undefined), 'widthPx and heightPx must travel together')
  .refine((value) => (value.focalX === undefined) === (value.focalY === undefined), 'focalX and focalY must travel together');
export const mediaReadSchema = z.object({ mediaId: z.uuid(), ownerOrganizationId: z.uuid().nullish() }).strict();
export const mediaReadManySchema = z.object({ mediaIds: z.array(z.uuid()).min(1).max(24), ownerOrganizationId: z.uuid().nullish() }).strict();
export const mediaListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(24),
  cursor: z.string().trim().min(1).max(100).optional(),
  owner: z.enum(['article', 'site', 'organization']).optional(),
  purpose: z.enum(MEDIA_PURPOSES).optional(),
  state: z.enum(['active', 'archived', 'rejected']).optional(),
  ownerOrganizationId: z.uuid().nullish(),
  search: z.string().trim().min(1).max(120).optional(),
}).strict();
export const mediaArchiveSchema = z.object({ mediaId: z.uuid(), expectedVersion: z.number().int().positive(), ownerOrganizationId: z.uuid().nullish() }).strict();
export const mediaMetadataSchema = z.object({
  mediaId: z.uuid(),
  ownerOrganizationId: z.uuid().nullish(),
  expectedVersion: z.number().int().positive(),
  altText: z.string().trim().min(1).max(300).nullish(),
  caption: z.string().trim().min(1).max(500).nullish(),
  sortOrder: z.number().int().min(0).max(1000000).optional(),
  focalX: z.number().int().min(0).max(100).nullish(),
  focalY: z.number().int().min(0).max(100).nullish(),
}).strict().refine((value) => {
  const mode = (side: number | null | undefined) => side === undefined ? 'keep' : side === null ? 'clear' : 'set';
  return mode(value.focalX) === mode(value.focalY);
}, 'focalX and focalY must travel together');

const publicationOptionsSchema = z.record(z.string().min(1).max(100), z.json()).default({});
const publicationTimestampSchema = z.iso.datetime({ offset: true });
const publicationOverrideSchema = z.object({
  title: z.string().trim().min(10).max(160).optional(),
  description: z.string().trim().min(50).max(500).optional(),
  imageMediaId: z.uuid().optional(),
}).strict().refine((override) => override.title !== undefined || override.description !== undefined || override.imageMediaId !== undefined, 'override_must_define_a_field');
export const publicationRequestSchema = z.object({
  articleId: z.uuid(),
  siteIds: z.array(z.uuid()).min(1),
  idempotencyKey: z.string().trim().min(1).max(200),
  options: publicationOptionsSchema,
  publishAt: publicationTimestampSchema.nullable().optional(),
  overrides: z.record(z.uuid(), publicationOverrideSchema).default({}),
}).strict();

export const publicationStatusSchema = z.object({ jobId: z.uuid() }).strict();

export const publicationSuggestSchema = z.object({
  articleId: z.uuid(),
  siteIds: z.array(z.uuid()).min(1),
}).strict();

export const publicationTargetSelectionSchema = z.object({
  jobId: z.uuid(),
  targetIds: z.array(z.uuid()).min(1).max(100).optional(),
}).strict();

export const publicationSiteRobotsSchema = z.object({
  articleSiteId: z.uuid(),
  directive: z.enum(['index', 'noindex']),
}).strict();

export const publicationBulkRequestSchema = z.object({
  articleIds: z.array(z.uuid()).min(1).max(20),
  siteIds: z.array(z.uuid()).min(1),
  idempotencyKey: z.string().trim().min(1).max(200),
  options: publicationOptionsSchema,
  publishAt: publicationTimestampSchema.nullable().optional(),
  overrides: z.record(z.uuid(), publicationOverrideSchema).default({}),
}).strict();