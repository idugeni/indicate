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

export const SINGLE_INVOICE_AMOUNT_IDR = 550_000;

const positiveAmountIdr = z.int().positive();

export const invoiceCreateSchema = z.object({
  organizationId: id,
  amountIdr: positiveAmountIdr,
  paidAt: z.iso.datetime(),
  billingNote: z.string().trim().max(500).nullish(),
  paymentMethod: z.string().trim().min(1).max(40).nullish(),
}).strict();

export const invoiceVoidSchema = z.object({
  invoiceId: id,
  expectedVersion: z.int().positive(),
  reason: z.string().trim().min(1).max(500),
}).strict();

export const invoiceIssueSchema = z.object({
  organizationId: id,
  amountIdr: positiveAmountIdr,
  dueAt: z.iso.datetime(),
  billingNote: z.string().trim().max(500).nullish(),
}).strict();

export const invoicePaySchema = z.object({
  invoiceId: id,
  expectedVersion: z.int().positive(),
  paidAt: z.iso.datetime(),
  paymentMethod: z.string().trim().min(1).max(40).nullish(),
}).strict();

export const invoiceReissueSchema = z.object({
  invoiceId: id,
  expectedVersion: z.int().positive(),
  reason: z.string().trim().min(1).max(500).nullish(),
}).strict();
