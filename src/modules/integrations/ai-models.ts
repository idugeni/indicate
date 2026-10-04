export type AiCredentialStatus = 'active' | 'inactive' | 'disabled' | 'exhausted' | 'invalid' | 'cooldown';

export type AiRotationStrategy = 'health_aware' | 'round_robin' | 'least_used' | 'lowest_error_rate' | 'priority_based' | 'random';

export type AiChainStrategy = 'fallback' | 'round_robin';

export interface AiCredentialProjection {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly keyMasked: string;
  readonly status: AiCredentialStatus;
  readonly priority: number;
  readonly cooldownUntil: string | null;
  readonly lastUsedAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastFailureAt: string | null;
  readonly lastErrorClass: string | null;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly avgLatencyMs: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AiRoutingPolicy {
  readonly rotationStrategy: AiRotationStrategy;
  readonly chainStrategy: AiChainStrategy;
  readonly primaryProviderId: string | null;
  readonly defaultModel: string;
  readonly fallbackProviderId: string | null;
  readonly fallbackModel: string;
  readonly maxRetries: number;
  readonly perKeyRetryLimit: number;
  readonly cooldownDurationSec: number;
  readonly requestTimeoutMs: number;
  readonly globalConcurrencyLimit: number;
  readonly version: number;
  readonly updatedAt: string;
}

export interface AiProviderEntry {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly supportsChat: boolean;
}

export interface AiRequestLogRow {
  readonly id: string;
  readonly channel: string;
  readonly modelName: string;
  readonly status: 'success' | 'failed' | 'blocked';
  readonly latencyMs: number;
  readonly totalTokens: number;
  readonly toolsExecuted: readonly string[];
  readonly createdAt: string;
}

export interface AiQueryInsightRow {
  readonly id: string;
  readonly query: string;
  readonly channel: string;
  readonly status: 'open' | 'resolved';
  readonly feedbackReason: string | null;
  readonly createdAt: string;
}

export interface AiMasterStatus {
  readonly provisioned: boolean;
  readonly version: number | null;
  readonly fingerprint: string | null;
  readonly rotatedAt: string | null;
  readonly createdAt: string | null;
}

export interface AiMasterProvision {
  readonly version: number;
  readonly fingerprint: string;
}

export interface AiOrgTokenUsage {
  readonly organizationId: string | null;
  readonly requests: number;
  readonly tokens: number;
  readonly blocked: number;
}

export interface AiModelEntry {
  readonly providerId: string;
  readonly modelName: string;
  readonly displayName: string;
  readonly releaseStage: string | null;
  readonly contextWindow: number;
  readonly outputTokenLimit: number | null;
  readonly rpmLimit: number | null;
  readonly tpmLimit: number | null;
  readonly rpdLimit: number | null;
  readonly supportsTools: boolean;
  readonly isDefault: boolean;
}

export interface AiOverview {
  readonly credentials: readonly AiCredentialProjection[];
  readonly policy: AiRoutingPolicy;
  readonly models: readonly AiModelEntry[];
  readonly providers: readonly AiProviderEntry[];
  readonly recentLogs: readonly AiRequestLogRow[];
  readonly queryInsights: readonly AiQueryInsightRow[];
  readonly tokenUsageByOrg: readonly AiOrgTokenUsage[];
  readonly master: AiMasterStatus;
  readonly stats: {
    readonly totalRequests: number;
    readonly successfulRequests: number;
    readonly failedRequests: number;
    readonly activeKeys: number;
    readonly cooldownKeys: number;
    readonly avgLatencyMs: number;
  };
}

/**
 * Mask an API key for display; the plain value never leaves the create form.
 *
 * @param raw - Plain API key from the create form.
 * @returns Masked form showing the first 6 and last 4 characters.
 */
export function maskAiKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 10) return '••••••••••';
  return `${trimmed.slice(0, 6)}••••••••••••${trimmed.slice(-4)}`;
}
