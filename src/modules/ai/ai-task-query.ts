import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import { taskThinkingOverride, type AiTaskKind } from '@/modules/ai/ai-task-profiles';
import type { AiCallerRole, AiChatImage, AiThinkingConfig } from '@/modules/ai/ai-types';
import { BUSY_MESSAGE, scanPrompt } from '@/modules/ai/ai-usage';

/**
 * Single generation request shared by every dashboard task helper.
 */
export interface AiTaskQuery {
  readonly prompt: string;
  readonly systemInstruction: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly thinkingTask?: AiTaskKind | (string & {}) | undefined;
  readonly thinkingConfig?: AiThinkingConfig | undefined;
  readonly responseMimeType?: string;
  readonly responseSchema?: Record<string, unknown> | undefined;
  readonly images?: readonly AiChatImage[] | undefined;
  readonly audio?: readonly { readonly base64: string; readonly mimeType: string }[] | undefined;
  readonly modelOverride?: string | undefined;
  readonly responseModalities?: readonly ('TEXT' | 'IMAGE' | 'AUDIO')[] | undefined;
  readonly speechVoiceName?: string | undefined;
  readonly skipSemanticCache?: boolean | undefined;
  readonly requireModelOwner?: boolean | undefined;
  readonly gatewayOnlyProviders?: readonly string[] | undefined;
}

/**
 * Run one guarded staff query with secret scan and task thinking budget.
 *
 * @param deps - Control-plane bounds from the owning helper; null stays busy.
 * @param callerRole - Caller role for audit and guardrails.
 * @param organizationId - Organization scoping credentials and audit.
 * @param query - Prompt, generation controls, and optional task media.
 * @returns Model text plus inline media when requested, or a safe busy message.
 */
export async function runTaskQuery(
  deps: AiServiceDeps | null,
  callerRole: AiCallerRole,
  organizationId: string | undefined,
  query: AiTaskQuery,
): Promise<
  | { readonly ok: true; readonly text: string; readonly inlineData?: readonly { readonly mimeType: string; readonly base64: string }[] }
  | { readonly ok: false; readonly error: string }
> {
  const scanned = scanPrompt(query.prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (deps === null) return { ok: false, error: BUSY_MESSAGE };
  const thinkingConfig = query.thinkingConfig
    ?? (query.thinkingTask === undefined ? undefined : taskThinkingOverride(query.thinkingTask));
  const result = await executeAiQuery(deps, {
    prompt: query.prompt,
    organizationId: organizationId ?? null,
    systemInstruction: query.systemInstruction,
    temperature: query.temperature,
    maxOutputTokens: query.maxOutputTokens,
    responseMimeType: query.responseMimeType,
    ...(query.responseSchema === undefined ? {} : { responseSchema: query.responseSchema }),
    ...(thinkingConfig === undefined ? {} : { thinkingConfig }),
    channel: 'web',
    callerRole,
    enableTools: false,
    ...(query.images === undefined ? {} : { images: [...query.images] }),
    ...(query.audio === undefined ? {} : { audio: [...query.audio] }),
    ...(query.modelOverride === undefined ? {} : { modelOverride: query.modelOverride }),
    ...(query.skipSemanticCache === undefined ? {} : { skipSemanticCache: query.skipSemanticCache }),
    ...(query.requireModelOwner === undefined ? {} : { requireModelOwner: query.requireModelOwner }),
    ...(query.gatewayOnlyProviders === undefined ? {} : { gatewayOnlyProviders: [...query.gatewayOnlyProviders] }),
    ...(query.responseModalities === undefined ? {} : { responseModalities: [...query.responseModalities] }),
    ...(query.speechVoiceName === undefined ? {} : { speechVoiceName: query.speechVoiceName }),
  });
  if (result.error !== undefined || (result.text.trim() === '' && (result.inlineData?.length ?? 0) === 0)) {
    return { ok: false, error: BUSY_MESSAGE };
  }
  return {
    ok: true,
    text: result.text,
    ...(result.inlineData === undefined || result.inlineData.length === 0 ? {} : { inlineData: result.inlineData }),
  };
}
