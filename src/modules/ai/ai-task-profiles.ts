import 'server-only';

import type { AiThinkingConfig } from '@/modules/ai/ai-types';

/**
 * Task kinds with a dedicated thinking budget.
 */
export type AiTaskKind =
  | 'caption'
  | 'seo'
  | 'polish'
  | 'summarize'
  | 'transcribe'
  | 'tts'
  | 'cover'
  | 'chat';

/**
 * Cheap-tier model profile per task with suggested temperature and thinking budget.
 *
 * @remarks An `undefined` `thinkingBudget` means the channel default applies.
 * A budget of `0` disables thinking explicitly for non-text tasks; the
 * `AiThinkingConfig` type permits `0`, so it is forwarded as-is.
 */
export interface TaskModelProfile {
  readonly modelTier: 'murah';
  readonly temperature: number;
  readonly thinkingBudget?: number | undefined;
}

/**
 * Single task-to-profile matrix for every dashboard helper.
 */
export const TASK_MODEL_PROFILE: Record<AiTaskKind, TaskModelProfile> = {
  caption: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 1024 },
  seo: { modelTier: 'murah', temperature: 0.5, thinkingBudget: 2048 },
  polish: { modelTier: 'murah', temperature: 0.5, thinkingBudget: 8192 },
  summarize: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 8192 },
  transcribe: { modelTier: 'murah', temperature: 0.2, thinkingBudget: 1024 },
  tts: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 0 },
  cover: { modelTier: 'murah', temperature: 0.8, thinkingBudget: 0 },
  chat: { modelTier: 'murah', temperature: 0.7 },
};

/**
 * Legacy Indonesian task aliases kept for backward compatibility.
 */
export const LEGACY_TASK_ALIASES = {
  ringkas: 'summarize',
  sampul: 'cover',
} as const;

/**
 * Resolve the thinking override for one task from the shared profile matrix.
 *
 * @param task - Task selecting the default budget; legacy aliases resolve first.
 * @param userOverride - Explicit caller override, honoured first.
 * @returns Task thinking config, or undefined for the channel default.
 */
export function taskThinkingOverride(
  task: AiTaskKind | (string & {}),
  userOverride?: AiThinkingConfig | undefined,
): AiThinkingConfig | undefined {
  if (userOverride?.thinkingBudget !== undefined) return userOverride;
  const canonical = (LEGACY_TASK_ALIASES as Record<string, AiTaskKind>)[task] ?? (task as AiTaskKind);
  const profile = (TASK_MODEL_PROFILE as Record<string, TaskModelProfile>)[canonical];
  if (profile?.thinkingBudget === undefined) return undefined;
  if (profile.thinkingBudget === 0) return { thinkingBudget: 0 };
  return { thinkingBudget: profile.thinkingBudget, includeThoughts: true };
}
