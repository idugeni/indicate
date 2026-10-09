import 'server-only';

import { z } from 'zod';

import type { ActorContext } from '@/core/operation-context';
import { authorizeAiOperatorTool, getAiOperatorTool, isAiOperatorToolExecutable } from '@/modules/ai-operator/tool-registry';

const proposedStepSchema = z.object({
  toolId: z.string().trim().min(1).max(120),
  input: z.unknown(),
  rationale: z.string().trim().min(1).max(500),
}).strict();

const proposedPlanSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  steps: z.array(proposedStepSchema).min(1).max(8),
}).strict();

export type ValidatedAiOperatorStep = {
  readonly toolId: string;
  readonly input: unknown;
  readonly rationale: string;
  readonly requiresApproval: boolean;
  readonly risk: 'read' | 'write' | 'high';
};

export type ValidatedAiOperatorPlan = {
  readonly summary: string;
  readonly steps: readonly ValidatedAiOperatorStep[];
};

export type AiOperatorPlanValidation =
  | { readonly ok: true; readonly plan: ValidatedAiOperatorPlan }
  | { readonly ok: false; readonly reason: 'INVALID_PLAN' | 'UNKNOWN_TOOL' | 'INVALID_TOOL_INPUT' | 'MISSING_PERMISSION' | 'PLATFORM_TOOL_NOT_SUPPORTED' | 'TOOL_NOT_EXECUTABLE' };

/**
 * Validates model-proposed plans against the same allow-list and actor grants
 * as direct tool execution. A plan is never execution authorization by itself.
 */
export function validateAiOperatorPlan(actor: ActorContext, candidate: unknown): AiOperatorPlanValidation {
  const parsed = proposedPlanSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, reason: 'INVALID_PLAN' };

  const steps: ValidatedAiOperatorStep[] = [];
  for (const proposed of parsed.data.steps) {
    const definition = getAiOperatorTool(proposed.toolId);
    if (definition === null) return { ok: false, reason: 'UNKNOWN_TOOL' };
    if (definition.scope !== 'tenant') return { ok: false, reason: 'PLATFORM_TOOL_NOT_SUPPORTED' };
    if (!isAiOperatorToolExecutable(proposed.toolId)) return { ok: false, reason: 'TOOL_NOT_EXECUTABLE' };

    const authorization = authorizeAiOperatorTool(actor, proposed.toolId, proposed.input);
    if (!authorization.allowed) {
      return {
        ok: false,
        reason: authorization.reason === 'UNKNOWN_TOOL'
          ? 'UNKNOWN_TOOL'
          : authorization.reason === 'INVALID_INPUT'
            ? 'INVALID_TOOL_INPUT'
            : 'MISSING_PERMISSION',
      };
    }

    const validatedInput = definition.input.parse(proposed.input);
    steps.push({
      toolId: proposed.toolId,
      input: validatedInput,
      rationale: proposed.rationale,
      requiresApproval: authorization.requiresApproval,
      risk: authorization.risk,
    });
  }

  return { ok: true, plan: { summary: parsed.data.summary, steps } };
}
