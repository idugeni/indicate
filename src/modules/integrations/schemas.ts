import { z } from 'zod';

const id = z.uuid();
const expectedVersion = z.number().int().positive();
const scopes = z.array(z.string().trim().min(1).max(100)).min(1).max(100).transform((values) => [...new Set(values)].sort());

export const apiKeyIssueSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes,
  expiresAt: z.iso.datetime().nullable().default(null),
}).strict();
export const apiKeyRotateSchema = z.object({
  apiKeyId: id,
  expectedVersion,
  name: z.string().trim().min(1).max(120).optional(),
  scopes: scopes.optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
}).strict();
export const apiKeyRevokeSchema = z.object({ apiKeyId: id, expectedVersion }).strict();

export const telegramMappingCreateSchema = z.object({
  userId: id,
  roleId: id,
  telegramUserId: z.string().trim().min(1).max(100),
  telegramChatId: z.string().trim().min(1).max(100),
  consentIpHash: z.string().regex(/^[0-9a-f]{64}$/).nullable().default(null),
}).strict();

/** Versi teks persetujuan penautan Telegram (PENDING A6 consent trail). */
export const TELEGRAM_LINK_CONSENT_VERSION = 'telegram-link/1';
export const telegramMappingUpdateSchema = z.object({
  mappingId: id,
  expectedVersion,
  userId: id,
  roleId: id,
  telegramUserId: z.string().trim().min(1).max(100),
  telegramChatId: z.string().trim().min(1).max(100),
  status: z.enum(['active', 'inactive', 'archived']),
}).strict();

export const telegramBroadcastSchema = z.object({
  text: z.string().trim().min(1).max(4000),
}).strict();

/** Trial writes disabled; legacy 'trialing' rows stay readable but reject on write. */
const subscriptionWriteStatus = z.enum(['active', 'past_due', 'suspended', 'cancelled']);

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  customerMetadata: z.record(z.string(), z.unknown()).default({}),
  subscription: z.object({
    plan: z.enum(['starter', 'growth', 'pro', 'enterprise']),
    status: subscriptionWriteStatus,
    periodStartsAt: z.iso.datetime().nullable().default(null),
    periodEndsAt: z.iso.datetime().nullable().default(null),
  }).strict().optional(),
}).strict();
export const customerUpdateSchema = z.object({
  organizationId: id,
  expectedVersion,
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(['active', 'inactive', 'archived']),
  customerMetadata: z.record(z.string(), z.unknown()),
}).strict();
export const subscriptionUpdateSchema = z.object({
  organizationId: id,
  expectedVersion: expectedVersion.optional(),
  plan: z.enum(['starter', 'growth', 'pro', 'enterprise']),
  status: subscriptionWriteStatus,
  periodStartsAt: z.iso.datetime().nullable().default(null),
  periodEndsAt: z.iso.datetime().nullable().default(null),
}).strict();

export const genericWebhookHeadersSchema = z.object({
  source: z.string().trim().min(1).max(100),
  replayId: z.string().trim().min(1).max(255),
  timestamp: z.coerce.number().int().nonnegative(),
  signature: z.string().regex(/^sha256=[a-f0-9]{64}$/),
}).strict();

const telegramDocumentSchema = z.object({
  file_id: z.string().min(1).max(255),
  file_name: z.string().min(1).max(255).optional(),
  mime_type: z.string().min(1).max(100).optional(),
  file_size: z.number().int().positive().optional(),
}).passthrough();
export const telegramUpdateSchema = z.object({
  update_id: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
  message: z.object({
    date: z.number().int().nonnegative(),
    from: z.object({ id: z.union([z.number().int(), z.string().regex(/^-?\d+$/)]) }).passthrough(),
    chat: z.object({ id: z.union([z.number().int(), z.string().regex(/^-?\d+$/)]) }).passthrough(),
    text: z.string().max(20_000).optional(),
    document: telegramDocumentSchema.optional(),
  }).passthrough(),
}).passthrough();

export const rateLimitPolicySchema = z.object({
  allowance: z.number().int().min(1).max(10_000),
  windowSeconds: z.number().int().min(1).max(3_600),
  failureMode: z.enum(['closed', 'open_low_risk']),
}).strict();
