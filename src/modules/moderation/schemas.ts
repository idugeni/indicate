import { z } from 'zod';

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@/modules/site/slug-allocator';

const id = z.uuid();
const category = z.enum(['copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other']);
const contact = z.string().trim().min(3).max(320);
const details = z.string().trim().min(10).max(4000);

/**
 * Reporter-supplied article link, restricted to absolute HTTP(S) URLs.
 *
 * The value is stored and later shipped to the dashboard moderation queue, so a
 * bare string bound would admit `javascript:` and `data:` payloads that become
 * script execution the moment a consumer renders it as a link.
 */
const articleUrl = z.url({ protocol: /^https?$/ }).max(2000);

const articleSlug = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.string().min(1).max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN).nullable().default(null),
);

export const reportIntakeSchema = z.object({
  articleSlug,
  contact,
  category,
  details,
  articleUrl: articleUrl.nullable().default(null),
}).strict();

export const reportSubmitSchema = z.object({
  orgId: id,
  siteId: id.nullable().default(null),
  articleId: id.nullable().default(null),
  contact,
  category,
  details,
  articleUrl: articleUrl.nullable().default(null),
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
