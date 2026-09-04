import { z } from 'zod';

const id = z.uuid();

export const orderCreateSchema = z.object({
  packageId: id,
  orgId: id.nullable().default(null),
}).strict();

export const proofAuthorizeSchema = z.object({
  orderId: id,
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
  checksumSha256: z.string().length(44),
}).strict();

export const proofSubmitSchema = z.object({
  orderId: id,
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
}).strict();

export const orderDecideSchema = z.object({
  orderId: id,
  approve: z.boolean(),
  orgId: id.nullable().default(null),
}).strict();

export const inviteCreateSchema = z.object({
  orgId: id,
  roleId: id,
  email: z.string().trim().min(3).max(320),
  tokenHash: z.string().length(64),
}).strict();

export const inviteRedeemSchema = z.object({
  tokenHash: z.string().length(64),
}).strict();
