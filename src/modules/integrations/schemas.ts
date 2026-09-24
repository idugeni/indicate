import { z } from 'zod';

const id = z.uuid();
const expectedVersion = z.number().int().positive();
const scopes = z.array(z.string().trim().min(1).max(100)).min(1).max(100).transform((values) => [...new Set(values)].sort());

export const apiKeyIssueSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes,
  expiresAt: z.iso.datetime().nullable().default(null),
  regionId: id.nullable().default(null),
}).strict();
export const apiKeyRotateSchema = z.object({
  apiKeyId: id,
  expectedVersion,
  name: z.string().trim().min(1).max(120).optional(),
  scopes: scopes.optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
}).strict();
export const apiKeyRevokeSchema = z.object({ apiKeyId: id, expectedVersion }).strict();

/** Manual activation writes only; no plans, no periods. */
const subscriptionWriteStatus = z.enum(['active', 'suspended', 'cancelled']);

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  customerMetadata: z.record(z.string(), z.unknown()).default({}),
  subscription: z.object({
    status: subscriptionWriteStatus,
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
  status: subscriptionWriteStatus,
}).strict();

export const genericWebhookHeadersSchema = z.object({
  source: z.string().trim().min(1).max(100),
  replayId: z.string().trim().min(1).max(255),
  timestamp: z.coerce.number().int().nonnegative(),
  signature: z.string().regex(/^sha256=[a-f0-9]{64}$/),
}).strict();

export const rateLimitPolicySchema = z.object({
  allowance: z.number().int().min(1).max(10_000),
  windowSeconds: z.number().int().min(1).max(3_600),
  failureMode: z.literal('closed'),
}).strict();
