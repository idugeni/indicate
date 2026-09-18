import { z } from 'zod';

const id = z.uuid();

export const inviteCreateSchema = z.object({
  orgId: id,
  roleId: id,
  email: z.string().trim().min(3).max(320),
  tokenHash: z.string().length(64),
}).strict();

export const inviteRedeemSchema = z.object({
  tokenHash: z.string().length(64),
}).strict();

export const invoiceCreateSchema = z.object({
  organizationId: id,
  amountIdr: z.number().int().min(0).max(999_999_999_999),
  paidAt: z.iso.datetime(),
  billingNote: z.string().trim().max(500).nullish(),
  paymentMethod: z.string().trim().min(1).max(40).nullish(),
}).strict();

export const invoiceVoidSchema = z.object({
  invoiceId: id,
  expectedVersion: z.int().positive(),
  reason: z.string().trim().min(1).max(500),
}).strict();
