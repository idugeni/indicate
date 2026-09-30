import { z } from 'zod';

const credentialId = z.uuid();

export const aiCredentialCreateSchema = z.object({
  label: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().min(10).max(200),
  priority: z.number().int().min(1).max(10).default(1),
}).strict();

export const aiCredentialTestSchema = z.object({
  credentialId,
}).strict();

export const aiCredentialToggleSchema = z.object({
  credentialId,
  status: z.enum(['active', 'disabled', 'cooldown']),
}).strict();

export const aiCredentialDeleteSchema = z.object({
  credentialId,
}).strict();

export const aiPolicyUpdateSchema = z.object({
  rotationStrategy: z.enum(['health_aware', 'round_robin', 'least_used', 'lowest_error_rate', 'priority_based', 'random']),
  defaultModel: z.string().trim().min(1).max(120),
  fallbackProviderId: z.string().trim().min(1).max(120).nullable().default(null),
  fallbackModel: z.string().trim().min(1).max(120).default('gemini-3.6-flash'),
  maxRetries: z.number().int().min(1).max(10),
  cooldownDurationSec: z.number().int().min(10).max(3600),
}).strict();

export const aiMasterProvisionSchema = z.object({
  rotate: z.boolean().optional().default(false),
  expectedVersion: z.number().int().positive().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.rotate && value.expectedVersion === undefined) {
    ctx.addIssue({ code: 'custom', message: 'expectedVersion is required when rotate is true.' });
  }
});

export const aiInsightReportSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  channel: z.string().trim().min(1).max(80).default('web'),
  feedbackReason: z.string().trim().max(500).optional(),
}).strict();

export const aiInsightResolveSchema = z.object({
  id: z.uuid(),
}).strict();
