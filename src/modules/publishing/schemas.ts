import { z } from 'zod';

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
  purpose: z.string().trim().min(1).max(100),
  owner: mediaOwnerSchema,
  thumb: z.object({
    mediaType: z.string().trim().min(1).max(100),
    sizeBytes: z.number().int().positive(),
    checksum: checksumField,
  }).strict().optional(),
}).strict();

export const mediaCompletionSchema = z.object({
  reservationId: z.uuid(),
  thumb: z.object({
    sizeBytes: z.number().int().positive(),
    checksum: checksumField,
  }).strict().optional(),
}).strict();
export const mediaReadSchema = z.object({ mediaId: z.uuid() }).strict();
export const mediaArchiveSchema = z.object({ mediaId: z.uuid(), expectedVersion: z.number().int().positive() }).strict();

const publicationOptionsSchema = z.record(z.string().min(1).max(100), z.json()).default({});
const publicationOverrideSchema = z.object({
  title: z.string().trim().min(10).max(160).optional(),
  description: z.string().trim().min(50).max(500).optional(),
  imageMediaId: z.uuid().optional(),
}).strict().refine((override) => override.title !== undefined || override.description !== undefined || override.imageMediaId !== undefined, 'override_must_define_a_field');
export const publicationRequestSchema = z.object({
  articleId: z.uuid(),
  siteIds: z.array(z.uuid()).min(1).max(100),
  idempotencyKey: z.string().trim().min(1).max(200),
  options: publicationOptionsSchema,
  overrides: z.record(z.uuid(), publicationOverrideSchema).default({}),
}).strict();

export const publicationStatusSchema = z.object({ jobId: z.uuid() }).strict();

export const publicationTargetSelectionSchema = z.object({
  jobId: z.uuid(),
  targetIds: z.array(z.uuid()).min(1).max(100).optional(),
}).strict();

export const publicationBulkRequestSchema = z.object({
  articleIds: z.array(z.uuid()).min(1).max(20),
  siteIds: z.array(z.uuid()).min(1).max(100),
  idempotencyKey: z.string().trim().min(1).max(200),
  options: publicationOptionsSchema,
  overrides: z.record(z.uuid(), publicationOverrideSchema).default({}),
}).strict();
