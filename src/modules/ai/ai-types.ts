import type { SQL } from 'drizzle-orm';

import type {
  aiCredentials,
  aiRequestLogs,
  aiRoutingPolicies,
} from '@/data/schema/ai';

export type AiCredentialStatus =
  | 'active'
  | 'inactive'
  | 'disabled'
  | 'exhausted'
  | 'invalid'
  | 'cooldown';

export type AiRotationStrategy =
  | 'round_robin'
  | 'random'
  | 'least_used'
  | 'lowest_error_rate'
  | 'priority_based'
  | 'health_aware';

export type AiErrorClass =
  | 'auth_failure'
  | 'invalid_key'
  | 'rate_limit'
  | 'quota_exhausted'
  | 'timeout'
  | 'network_error'
  | 'provider_unavailable'
  | 'malformed_response'
  | 'model_unavailable'
  | 'safety_blocked'
  | 'application_error';

export type AiAccessChannel = 'web' | 'telegram' | 'api';

export type AiCallerRole =
  | 'public'
  | 'author'
  | 'editor'
  | 'upt_operator'
  | 'operator'
  | 'publisher'
  | 'admin'
  | 'superadmin';

/**
 * Structural database port for the AI control plane.
 *
 * @remarks Satisfied by the Drizzle runtime database. Raw `sql` statements
 * keep every read projected and `LIMIT`-bounded without depending on the
 * `src/data/schema/ai.ts` tables landing first; row shapes are validated at
 * runtime in `ai-router.ts`.
 */
export interface AiDb {
  readonly execute: (query: SQL) => Promise<unknown>;
}

/**
 * Drizzle source-of-truth rows for the AI control-plane tables.
 *
 * @remarks `AiCredentialRecord` and `AiRoutingPolicy` mirror these shapes in
 * transport form (timestamps as ISO strings); keep both aligned when the
 * tables evolve. No table is defined here.
 */
export type AiCredentialTableRow = typeof aiCredentials.$inferSelect;
export type AiRoutingPolicyTableRow = typeof aiRoutingPolicies.$inferSelect;
export type AiRequestLogTableRow = typeof aiRequestLogs.$inferInsert;

/**
 * One decrypted-capable provider credential row.
 *
 * @remarks `organizationId` scopes a key to a single tenant; `null` marks a
 * shared global key. Only `keyMasked` ever leaves the server boundary.
 */
export interface AiCredentialRecord {
  readonly id: string;
  readonly providerId: string;
  readonly organizationId: string | null;
  readonly label: string;
  readonly keyEncrypted: string;
  readonly keyMasked: string;
  readonly status: AiCredentialStatus;
  readonly priority: number;
  readonly weight: number;
  readonly cooldownUntil: string | null;
  readonly lastUsedAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastFailureAt: string | null;
  readonly lastErrorMessage: string | null;
  readonly lastErrorClass: AiErrorClass | null;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly rateLimitCount: number;
  readonly quotaExhaustedCount: number;
  readonly avgLatencyMs: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AiRoutingPolicy {
  readonly id: string;
  readonly rotationStrategy: AiRotationStrategy;
  readonly primaryProviderId: string | null;
  readonly fallbackProviderId: string | null;
  readonly defaultModel: string;
  readonly fallbackModel: string;
  readonly maxRetries: number;
  readonly perKeyRetryLimit: number;
  readonly cooldownDurationSec: number;
  readonly requestTimeoutMs: number;
  readonly globalConcurrencyLimit: number;
  readonly updatedAt: string;
}

export interface AiModelConfig {
  readonly id: string;
  readonly providerId: string;
  readonly modelName: string;
  readonly displayName: string;
  readonly description: string | null;
  readonly contextWindow: number;
  readonly inputTokenLimit?: number | undefined;
  readonly outputTokenLimit?: number | undefined;
  readonly supportedModalities?: string[] | undefined;
  readonly releaseStage?: string | undefined;
  readonly rpmLimit?: number | undefined;
  readonly tpmLimit?: number | undefined;
  readonly rpdLimit?: number | undefined;
  readonly taskRecommendation?: string | null | undefined;
  readonly supportsTools: boolean;
  readonly supportsVision: boolean;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly priority: number;
}

export interface AiThinkingConfig {
  readonly thinkingBudget?: number | undefined;
  readonly includeThoughts?: boolean | undefined;
}

export interface ChatMessage {
  readonly role: 'user' | 'assistant' | 'model';
  readonly text: string;
}

export interface AiSafetySetting {
  readonly category:
    | 'HARM_CATEGORY_HARASSMENT'
    | 'HARM_CATEGORY_HATE_SPEECH'
    | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
    | 'HARM_CATEGORY_DANGEROUS_CONTENT'
    | 'HARM_CATEGORY_CIVIC_INTEGRITY';
  readonly threshold:
    | 'BLOCK_NONE'
    | 'BLOCK_ONLY_HIGH'
    | 'BLOCK_MEDIUM_AND_ABOVE'
    | 'BLOCK_LOW_AND_ABOVE'
    | 'HARM_BLOCK_THRESHOLD_UNSPECIFIED';
}

export interface AiChatImage {
  readonly base64: string;
  readonly mimeType: string;
}

export interface AiChatAudio {
  readonly base64: string;
  readonly mimeType: string;
}

export type AiResponseModality = 'TEXT' | 'IMAGE' | 'AUDIO';

export interface AiInlineData {
  readonly mimeType: string;
  readonly base64: string;
}

/**
 * Caller-supplied generation request.
 *
 * @remarks `organizationId` binds credential selection and request logs to
 * one tenant; `null` selects from shared global credentials only.
 */
export interface AiChatPrompt {
  readonly prompt: string;
  readonly organizationId?: string | null | undefined;
  readonly history?: ChatMessage[] | undefined;
  readonly systemInstruction?: string | undefined;
  readonly temperature?: number | undefined;
  readonly topP?: number | undefined;
  readonly topK?: number | undefined;
  readonly maxOutputTokens?: number | undefined;
  readonly presencePenalty?: number | undefined;
  readonly frequencyPenalty?: number | undefined;
  readonly seed?: number | undefined;
  readonly responseMimeType?: string | undefined;
  readonly responseSchema?: Record<string, unknown> | undefined;
  readonly stopSequences?: string[] | undefined;
  readonly thinkingConfig?: AiThinkingConfig | undefined;
  readonly safetySettings?: AiSafetySetting[] | undefined;
  readonly enableTools?: boolean | undefined;
  readonly images?: readonly AiChatImage[] | undefined;
  readonly audio?: readonly AiChatAudio[] | undefined;
  readonly responseModalities?: readonly AiResponseModality[] | undefined;
  readonly speechVoiceName?: string | undefined;
  readonly channel?: AiAccessChannel | undefined;
  readonly callerRole?: AiCallerRole | undefined;
  readonly correlationId?: string | undefined;
  readonly modelOverride?: string | undefined;
}

export interface AiGenerationResult {
  readonly text: string;
  readonly providerId: string;
  readonly modelName: string;
  readonly credentialId: string;
  readonly credentialMasked: string;
  readonly latencyMs: number;
  readonly retryCount: number;
  readonly toolCallsExecuted: readonly string[];
  readonly toolResults?: Record<string, unknown> | undefined;
  readonly inlineData?: readonly AiInlineData[] | undefined;
  readonly tokensUsage?:
    | {
        readonly prompt: number;
        readonly completion: number;
        readonly total: number;
      }
    | undefined;
  readonly error?: string | undefined;
}
