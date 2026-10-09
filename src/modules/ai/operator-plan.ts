import { z } from 'zod';

import { findOperatorCapability } from '@/modules/ai/operator-capabilities';

const stepSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  capabilityId: z.string().min(1).max(120),
  arguments: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const operatorPlanSchema = z.object({
  steps: z.array(stepSchema).min(1).max(8),
}).strict();

export type OperatorPlan = z.infer<typeof operatorPlanSchema>;
export type OperatorPlanValidation =
  | { readonly ok: true; readonly plan: OperatorPlan }
  | { readonly ok: false; readonly code: 'INVALID_PLAN' | 'DUPLICATE_STEP' | 'UNKNOWN_CAPABILITY' | 'WRITE_NOT_SUPPORTED'; readonly message: string };

/** Validate untrusted model output before any capability can be dispatched. */
export function validateOperatorPlan(input: unknown): OperatorPlanValidation {
  const parsed = operatorPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'INVALID_PLAN', message: 'Rencana AI tidak sesuai skema.' };

  const ids = new Set<string>();
  const capabilityIds = new Set<string>();
  for (const step of parsed.data.steps) {
    if (ids.has(step.id)) return { ok: false, code: 'DUPLICATE_STEP', message: 'ID langkah harus unik.' };
    ids.add(step.id);
    if (capabilityIds.has(step.capabilityId)) return { ok: false, code: 'DUPLICATE_STEP', message: 'Setiap kemampuan hanya boleh dipanggil sekali per rencana.' };
    capabilityIds.add(step.capabilityId);
    const capability = findOperatorCapability(step.capabilityId);
    if (capability === null) return { ok: false, code: 'UNKNOWN_CAPABILITY', message: 'Kemampuan tidak terdaftar.' };
    if (capability.risk !== 'read') return { ok: false, code: 'WRITE_NOT_SUPPORTED', message: 'Kemampuan tulis belum didukung.' };
  }

  return { ok: true, plan: parsed.data };
}
