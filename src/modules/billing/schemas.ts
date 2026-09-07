import { z } from 'zod';

const id = z.uuid();

/** Versi teks persetujuan lead enterprise (PENDING A6 consent trail). */
export const LEAD_CONSENT_TEXT_VERSION = 'lead-consent/1';

export const leadSubmitSchema = z.object({
  nama: z.string().trim().min(1).max(200),
  email: z.string().trim().min(3).max(320),
  kebutuhan: z.string().trim().min(10).max(4000),
  /** Clickwrap: lead wajib mencentang persetujuan pemrosesan data. */
  consent: z.literal(true),
}).strict();

export const orderCreateSchema = z.object({
  packageId: id,
  orgId: id.nullable().default(null),
  /** Clickwrap: order wajib menyatakan persetujuan versi Ketentuan yang berlaku. */
  termsAccepted: z.literal(true),
  termsVersion: z.string().trim().min(1).max(32),
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

export const orderRefundSchema = z.object({
  orderId: id,
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
