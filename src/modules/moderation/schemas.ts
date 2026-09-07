import { z } from 'zod';

const id = z.uuid();
const category = z.enum(['copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other']);

export const reportSubmitSchema = z.object({
  orgId: id,
  siteId: id.nullable().default(null),
  articleId: id.nullable().default(null),
  contact: z.string().trim().min(3).max(320),
  category,
  details: z.string().trim().min(10).max(4000),
  articleUrl: z.string().trim().min(8).max(2000).nullable().default(null),
}).strict();

export const reportDecideSchema = z.object({
  reportId: id,
  actionTaken: z.boolean(),
  note: z.string().trim().min(1).max(2000).nullable().default(null),
}).strict();

export const privacySubmitSchema = z.object({
  orgId: id,
  requestType: z.enum(['access', 'correction', 'deletion', 'portability', 'restriction']),
  details: z.string().trim().min(10).max(4000),
}).strict();

export const privacyDecideSchema = z.object({
  ticket: z.string().trim().min(1).max(32),
  status: z.enum(['in_progress', 'fulfilled', 'rejected']),
  note: z.string().trim().min(1).max(2000).nullable().default(null),
}).strict();

export const holdCreateSchema = z.object({
  organizationId: id,
  reason: z.string().trim().min(10).max(2000),
}).strict();

export const holdReleaseSchema = z.object({
  holdId: id,
}).strict();

export const erasureRequestSchema = z.object({
  organizationId: id,
  reason: z.string().trim().min(10).max(2000),
  scheduledFor: z.iso.datetime(),
}).strict();
