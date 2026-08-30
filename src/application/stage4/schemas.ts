import { z } from 'zod';

export const mediaOwnerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('article'), articleId: z.uuid() }).strict(),
  z.object({ kind: z.literal('site'), siteId: z.uuid() }).strict(),
  z.object({ kind: z.literal('organization') }).strict(),
]);

export const mediaReservationSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mediaType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().trim().regex(/^[A-Za-z0-9+/]{43}=$/, 'Expected a base64-encoded SHA-256 checksum.'),
  purpose: z.string().trim().min(1).max(100),
  owner: mediaOwnerSchema,
}).strict();

export const mediaCompletionSchema = z.object({ reservationId: z.uuid() }).strict();
export const mediaReadSchema = z.object({ mediaId: z.uuid() }).strict();
export const mediaArchiveSchema = z.object({ mediaId: z.uuid(), expectedVersion: z.number().int().positive() }).strict();

export const publicationOptionsSchema = z.record(z.string().min(1).max(100), z.json()).default({});
export const publicationRequestSchema = z.object({
  articleId: z.uuid(),
  siteIds: z.array(z.uuid()).min(1).max(100),
  idempotencyKey: z.string().trim().min(1).max(200),
  options: publicationOptionsSchema,
}).strict();

export const publicationStatusSchema = z.object({ jobId: z.uuid() }).strict();

export const targetTransitionSchema = z.object({
  targetId: z.uuid(),
  toState: z.enum(['processing', 'published', 'failed', 'retrying']),
  publishedUrl: z.url().nullable().optional(),
  retryable: z.boolean().optional(),
  failureCode: z.string().trim().min(1).max(100).optional(),
}).strict();
