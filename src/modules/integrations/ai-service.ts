import { createHash, randomBytes } from 'node:crypto';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import {
  maskAiKey,
  type AiChainStrategy,
  type AiCredentialProjection,
  type AiCredentialStatus,
  type AiMasterProvision,
  type AiMasterStatus,
  type AiModelEntry,
  type AiOrgTokenUsage,
  type AiOverview,
  type AiProviderEntry,
  type AiQueryInsightRow,
  type AiRequestLogRow,
  type AiRotationStrategy,
  type AiRoutingPolicy,
} from '@/modules/integrations/ai-models';
import {
  aiCredentialCreateSchema,
  aiCredentialDeleteSchema,
  aiCredentialTestSchema,
  aiCredentialToggleSchema,
  aiInsightReportSchema,
  aiInsightResolveSchema,
  aiMasterProvisionSchema,
  aiPolicyUpdateSchema,
} from '@/modules/integrations/ai-schemas';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

export interface AiRepositoryPort {
  listCredentials(actor: AuthorizedTenantActorContext): Promise<readonly AiCredentialProjection[]>;
  createCredential(actor: AuthorizedTenantActorContext, input: { readonly label: string; readonly plainKey: string; readonly priority: number; readonly keyMasked: string; readonly providerId: string; readonly now: string }): Promise<AiCredentialProjection>;
  updateCredentialStatus(actor: AuthorizedTenantActorContext, credentialId: string, status: AiCredentialStatus, cooldownUntil: string | null, now: string): Promise<AiCredentialProjection | null>;
  deleteCredential(actor: AuthorizedTenantActorContext, credentialId: string): Promise<boolean>;
  decryptCredentialKey(actor: AuthorizedTenantActorContext, credentialId: string): Promise<string | null>;
  recordCredentialTest(actor: AuthorizedTenantActorContext, credentialId: string, ok: boolean, latencyMs: number, errorClass: string | null, errorMessage: string | null, now: string): Promise<void>;
  recordBlockedCredential(actor: AuthorizedTenantActorContext, credentialId: string, errorClass: string, cooldownUntil: string, now: string): Promise<void>;
  getPolicy(actor: AuthorizedTenantActorContext): Promise<AiRoutingPolicy>;
  upsertPolicy(actor: AuthorizedTenantActorContext, input: { readonly rotationStrategy: AiRotationStrategy; readonly chainStrategy: AiChainStrategy; readonly primaryProviderId: string | null; readonly defaultModel: string; readonly fallbackProviderId: string | null; readonly fallbackModel: string; readonly maxRetries: number; readonly perKeyRetryLimit: number; readonly cooldownDurationSec: number; readonly requestTimeoutMs: number; readonly globalConcurrencyLimit: number; readonly now: string }): Promise<AiRoutingPolicy>;
  listModels(actor: AuthorizedTenantActorContext): Promise<readonly AiModelEntry[]>;
  listProviders(actor: AuthorizedTenantActorContext): Promise<readonly AiProviderEntry[]>;
  listRequestLogs(actor: AuthorizedTenantActorContext): Promise<readonly AiRequestLogRow[]>;
  listQueryInsights(actor: AuthorizedTenantActorContext): Promise<readonly AiQueryInsightRow[]>;
  getTokenUsageByOrg(actor: AuthorizedTenantActorContext): Promise<readonly AiOrgTokenUsage[]>;
  getMasterStatus(actor: AuthorizedTenantActorContext): Promise<AiMasterStatus>;
  provisionMaster(actor: AuthorizedTenantActorContext, input: { readonly secretPlain: string; readonly rotate: boolean; readonly expectedVersion?: number | undefined; readonly now: string }): Promise<number>;
  createInsight(actor: AuthorizedTenantActorContext, input: { readonly query: string; readonly channel: string; readonly feedbackReason?: string | undefined; readonly now: string }): Promise<AiQueryInsightRow>;
  resolveInsight(actor: AuthorizedTenantActorContext, id: string): Promise<AiQueryInsightRow | null>;
  recordDenial(actor: AuthorizedTenantActorContext, action: string): Promise<void>;
}

export interface AiTestResult {
  readonly credentialId: string;
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly message: string;
}

const FALLBACK_MODELS: readonly AiModelEntry[] = [
  { providerId: 'gemini', modelName: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', releaseStage: 'stable', contextWindow: 1048576, outputTokenLimit: 65536, rpmLimit: null, tpmLimit: null, rpdLimit: null, supportsTools: true, isDefault: true },
];

function errorClassForStatus(status: number): string {
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 401 || status === 403) return 'invalid_key';
  if (status >= 500) return 'provider_unavailable';
  return 'api_error';
}

/**
 * OpenAI-compatible chat base URLs per provider for credential probing.
 *
 * @remarks Duplicated from `src/integrations/ai/adapter-registry.ts` to keep
 * the modules → integrations dependency direction intact; both maps must stay
 * aligned when a provider endpoint changes.
 */
const OPENAI_COMPATIBLE_BASE_URLS: Readonly<Record<string, string>> = {
  'openai-compatible': 'https://api.openai.com/v1',
  'vercel-gateway': 'https://ai-gateway.vercel.sh/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

function openAiCompatibleBaseUrl(providerId: string): string | null {
  return OPENAI_COMPATIBLE_BASE_URLS[providerId] ?? null;
}

export class AiService {
  constructor(
    private readonly repository: AiRepositoryPort,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  private canManage(actor: AuthorizedTenantActorContext): boolean {
    const platform = actor.platformPermissionSet;
    if (platform === undefined) return false;
    return (
      platform.has(INTEGRATIONS_PERMISSIONS.aiManage) ||
      platform.has(INTEGRATIONS_PERMISSIONS.superAdmin) ||
      platform.has(INTEGRATIONS_PERMISSIONS.customerAdmin)
    );
  }

  private async denied(actor: AuthorizedTenantActorContext, action: string): Promise<Result<never, PublicErrorEnvelope>> {
    try {
      await this.repository.recordDenial(actor, action);
    } catch {
      /* denial remains non-disclosing when audit storage is unavailable */
    }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }

  private failure(actor: AuthorizedTenantActorContext, message: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', message, actor.requestId) };
  }

  private canReport(actor: AuthorizedTenantActorContext): boolean {
    if (this.canManage(actor)) return true;
    return actor.permissionSet.has('article.manage') || actor.permissionSet.has('article.read');
  }

  private conflict(actor: AuthorizedTenantActorContext, message: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('CONFLICT', message, actor.requestId) };
  }

  /**
   * Read the AI control-plane overview with bounded projections.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @returns Credentials, singleton policy, model directory, recent logs, insights, per-org token usage, and derived stats.
   */
  async overview(actor: AuthorizedTenantActorContext): Promise<Result<AiOverview, PublicErrorEnvelope>> {
    if (!this.canManage(actor)) return this.denied(actor, 'ai.overview.denied');
    try {
      const [credentials, policy, models, providers, recentLogs, queryInsights, tokenUsageByOrg, master] = await Promise.all([
        this.repository.listCredentials(actor),
        this.repository.getPolicy(actor),
        this.repository.listModels(actor),
        this.repository.listProviders(actor),
        this.repository.listRequestLogs(actor),
        this.repository.listQueryInsights(actor),
        this.repository.getTokenUsageByOrg(actor),
        this.repository.getMasterStatus(actor),
      ]);
      const totalRequests = credentials.reduce((sum, row) => sum + row.totalRequests, 0);
      const successfulRequests = credentials.reduce((sum, row) => sum + row.successfulRequests, 0);
      const failedRequests = credentials.reduce((sum, row) => sum + row.failedRequests, 0);
      const activeKeys = credentials.filter((row) => row.status === 'active').length;
      const cooldownKeys = credentials.filter((row) => row.status === 'cooldown').length;
      const withLatency = credentials.filter((row) => row.avgLatencyMs > 0);
      const avgLatencyMs = withLatency.length === 0 ? 0 : Math.round(withLatency.reduce((sum, row) => sum + row.avgLatencyMs, 0) / withLatency.length);
      return {
        ok: true,
        value: {
          credentials,
          policy,
          models: models.length > 0 ? models : FALLBACK_MODELS,
          providers,
          recentLogs,
          queryInsights,
          tokenUsageByOrg,
          master,
          stats: { totalRequests, successfulRequests, failedRequests, activeKeys, cooldownKeys, avgLatencyMs },
        },
      };
    } catch {
      return this.failure(actor, 'AI overview is temporarily unavailable.');
    }
  }

  /**
   * Store one provider credential in the DB-encrypted envelope; only the mask is readable.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ label, apiKey, priority, providerId }` payload.
   * @returns Masked projection; the plain key is never returned or persisted.
   */
  async createCredential(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiCredentialProjection, PublicErrorEnvelope>> {
    const parsed = aiCredentialCreateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the credential fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.credential.create.denied');
    try {
      const value = await this.repository.createCredential(actor, {
        label: parsed.data.label,
        plainKey: parsed.data.apiKey,
        priority: parsed.data.priority,
        providerId: parsed.data.providerId,
        keyMasked: maskAiKey(parsed.data.apiKey),
        now: this.clock.now().toISOString(),
      });
      return { ok: true, value };
    } catch {
      return this.failure(actor, 'The credential could not be stored.');
    }
  }

  /**
   * Ping one credential against its own provider transport and record the outcome counters.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ credentialId }` payload.
   * @returns Probe outcome with the measured provider round-trip latency.
   */
  async testCredential(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiTestResult, PublicErrorEnvelope>> {
    const parsed = aiCredentialTestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the credential fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.credential.test.denied');
    try {
      const credentials = await this.repository.listCredentials(actor);
      const target = credentials.find((row) => row.id === parsed.data.credentialId);
      if (target === undefined) return this.denied(actor, 'ai.credential.test.denied');
      if (target.status !== 'active') {
        return { ok: true, value: { credentialId: target.id, ok: false, latencyMs: 0, message: `Kredensial berstatus ${target.status}; aktifkan dulu sebelum diuji.` } };
      }
      const plain = await this.repository.decryptCredentialKey(actor, target.id);
      if (plain === null) return this.failure(actor, 'The credential could not be decrypted.');
      const policy = await this.repository.getPolicy(actor);
      const started = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.min(policy.requestTimeoutMs, 30_000));
      try {
        const baseUrl = openAiCompatibleBaseUrl(target.providerId);
        const response =
          baseUrl === null
            ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(await this.probeModelFor(actor, target.providerId, policy.defaultModel))}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': plain },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping. Balas dengan OK.' }] }] }),
                signal: controller.signal,
              })
            : await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${plain}` },
                signal: controller.signal,
              });
        const latencyMs = Date.now() - started;
        const now = this.clock.now().toISOString();
        if (response.ok) {
          await this.repository.recordCredentialTest(actor, target.id, true, latencyMs, null, null, now);
          return { ok: true, value: { credentialId: target.id, ok: true, latencyMs, message: `Kredensial valid & aktif (${latencyMs} ms).` } };
        }
        const errorClass = errorClassForStatus(response.status);
        await this.repository.recordCredentialTest(actor, target.id, false, latencyMs, errorClass, `HTTP ${response.status}`, now);
        if (response.status === 429) {
          const cooldownUntil = new Date(Date.now() + policy.cooldownDurationSec * 1000).toISOString();
          await this.repository.recordBlockedCredential(actor, target.id, errorClass, cooldownUntil, now);
          return { ok: true, value: { credentialId: target.id, ok: false, latencyMs, message: 'Kunci terkena rate limit; otomatis masuk cooldown.' } };
        }
        return { ok: true, value: { credentialId: target.id, ok: false, latencyMs, message: `Uji gagal (HTTP ${response.status}, ${errorClass}).` } };
      } catch (error: unknown) {
        const latencyMs = Date.now() - started;
        const now = this.clock.now().toISOString();
        const errorClass = error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network_error';
        await this.repository.recordCredentialTest(actor, target.id, false, latencyMs, errorClass, error instanceof Error ? error.message : 'network failure', now);
        return { ok: true, value: { credentialId: target.id, ok: false, latencyMs, message: `Uji gagal: ${errorClass}.` } };
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return this.failure(actor, 'The credential test is temporarily unavailable.');
    }
  }

  /**
   * Pick a probe model owned by one provider for the Gemini ping.
   *
   * @param actor - Tenant actor; the model directory is control-plane wide.
   * @param providerId - Provider whose key is under test.
   * @param fallback - Policy default used when the catalog knows no model for the provider.
   * @returns Catalog model of the provider, or the policy default.
   */
  private async probeModelFor(actor: AuthorizedTenantActorContext, providerId: string, fallback: string): Promise<string> {
    try {
      const models = await this.repository.listModels(actor);
      return models.find((model) => model.providerId === providerId)?.modelName ?? fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Move a credential between active, disabled, and cooldown states.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ credentialId, status }` payload.
   * @returns Updated masked projection.
   */
  async toggleCredential(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiCredentialProjection, PublicErrorEnvelope>> {
    const parsed = aiCredentialToggleSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the credential fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.credential.toggle.denied');
    try {
      const now = this.clock.now();
      let cooldownUntil: string | null = null;
      if (parsed.data.status === 'cooldown') {
        const policy = await this.repository.getPolicy(actor);
        cooldownUntil = new Date(now.getTime() + policy.cooldownDurationSec * 1000).toISOString();
      }
      const updated = await this.repository.updateCredentialStatus(actor, parsed.data.credentialId, parsed.data.status, cooldownUntil, now.toISOString());
      if (updated === null) return this.denied(actor, 'ai.credential.toggle.denied');
      return { ok: true, value: updated };
    } catch {
      return this.failure(actor, 'The credential status could not be updated.');
    }
  }

  /**
   * Delete a credential by id.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ credentialId }` payload.
   * @returns Deleted credential id.
   */
  async deleteCredential(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly credentialId: string }, PublicErrorEnvelope>> {
    const parsed = aiCredentialDeleteSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the credential fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.credential.delete.denied');
    try {
      const deleted = await this.repository.deleteCredential(actor, parsed.data.credentialId);
      if (!deleted) return this.denied(actor, 'ai.credential.delete.denied');
      return { ok: true, value: { credentialId: parsed.data.credentialId } };
    } catch {
      return this.failure(actor, 'The credential could not be deleted.');
    }
  }

  /**
   * Replace the singleton rotation policy, including the configured failover chain.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ rotationStrategy, chainStrategy, primaryProviderId, defaultModel, fallbackProviderId, fallbackModel, maxRetries, perKeyRetryLimit, cooldownDurationSec, requestTimeoutMs, globalConcurrencyLimit }` payload.
   * @returns Stored policy.
   */
  async updatePolicy(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiRoutingPolicy, PublicErrorEnvelope>> {
    const parsed = aiPolicyUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the policy fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.policy.update.denied');
    try {
      const mismatch = await this.validateModelChain(actor, parsed.data);
      if (mismatch !== null) return { ok: false, error: createPublicError('INVALID_INPUT', mismatch, actor.requestId) };
      const value = await this.repository.upsertPolicy(actor, { ...parsed.data, now: this.clock.now().toISOString() });
      return { ok: true, value };
    } catch {
      return this.failure(actor, 'The routing policy could not be saved.');
    }
  }

  /**
   * Validate provider existence and model-provider pairing for one policy write.
   *
   * @param actor - Tenant actor; models and providers are control-plane wide.
   * @param input - Parsed policy payload with resolved defaults.
   * @returns Indonesian field message when invalid; null when the chain is consistent.
   * @remarks Unknown model names are allowed (catalog may lag new provider models);
   * only known catalog entries are checked against their owning provider.
   * A round_robin chain with one entry (no fallback provider and identical
   * default/fallback model) is rejected; round robin needs two entries.
   */
  private async validateModelChain(
    actor: AuthorizedTenantActorContext,
    input: { readonly chainStrategy: AiChainStrategy; readonly primaryProviderId: string | null; readonly defaultModel: string; readonly fallbackProviderId: string | null; readonly fallbackModel: string },
  ): Promise<string | null> {
    try {
      const [providers, models, stored] = await Promise.all([
        this.repository.listProviders(actor),
        this.repository.listModels(actor),
        this.repository.getPolicy(actor),
      ]);
      const chatCapable = new Map(providers.map((provider) => [provider.id, provider.supportsChat] as const));
      const primary = input.primaryProviderId ?? stored.primaryProviderId;
      if (primary !== null && !chatCapable.has(primary)) return `Provider primer tidak dikenal: ${primary}.`;
      if (primary !== null && chatCapable.get(primary) === false) {
        return `Provider ${primary} tidak mendukung chat; pilih provider chat dari direktori.`;
      }
      if (input.fallbackProviderId !== null && !chatCapable.has(input.fallbackProviderId)) {
        return `Provider fallback tidak dikenal: ${input.fallbackProviderId}.`;
      }
      if (input.fallbackProviderId !== null && chatCapable.get(input.fallbackProviderId) === false) {
        return `Provider ${input.fallbackProviderId} tidak mendukung chat; pilih provider chat dari direktori.`;
      }
      const owner = new Map(models.map((model) => [model.modelName, model.providerId] as const));
      const defaultOwner = owner.get(input.defaultModel);
      if (primary !== null && defaultOwner !== undefined && defaultOwner !== primary) {
        return `Model default ${input.defaultModel} milik ${defaultOwner}, bukan ${primary}.`;
      }
      const fallbackOwner = owner.get(input.fallbackModel);
      const fallbackProvider = input.fallbackProviderId ?? primary;
      if (fallbackProvider !== null && fallbackOwner !== undefined && fallbackOwner !== fallbackProvider) {
        return `Model fallback ${input.fallbackModel} milik ${fallbackOwner}, bukan ${fallbackProvider}.`;
      }
      if (input.chainStrategy === 'round_robin' && input.fallbackProviderId === null && input.fallbackModel === input.defaultModel) {
        return 'Round robin butuh 2 entri rantai: isi provider fallback atau bedakan model fallback.';
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Provision the singleton AI master secret; the plain value never leaves the server.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ rotate, expectedVersion }` payload.
   * @returns Version and 8-char sha256 fingerprint only; never the plain secret.
   */
  async provisionMaster(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiMasterProvision, PublicErrorEnvelope>> {
    const parsed = aiMasterProvisionSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the provision fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.master.provision.denied');
    try {
      const status = await this.repository.getMasterStatus(actor);
      if (status.provisioned && !parsed.data.rotate) {
        return this.conflict(actor, 'Master secret is already provisioned. Rotate with the current version.');
      }
      if (parsed.data.rotate && status.provisioned && parsed.data.expectedVersion !== status.version) {
        return this.conflict(actor, 'Master version mismatch. Reload and rotate again.');
      }
      const secretPlain = randomBytes(48).toString('base64');
      const fingerprint = createHash('sha256').update(secretPlain).digest('hex').slice(0, 8);
      const version = await this.repository.provisionMaster(actor, {
        secretPlain,
        rotate: parsed.data.rotate ?? false,
        ...(parsed.data.expectedVersion === undefined ? {} : { expectedVersion: parsed.data.expectedVersion }),
        now: this.clock.now().toISOString(),
      });
      return { ok: true, value: { version, fingerprint } };
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AI_MASTER_CONFLICT') {
        return this.conflict(actor, 'Master secret is already provisioned. Rotate with the current version.');
      }
      return this.failure(actor, 'The master secret could not be provisioned.');
    }
  }

  /**
   * Record editor feedback for an AI answer as an open triage insight.
   *
   * @param actor - Tenant actor; requires article read/manage or the platform AI grant.
   * @param raw - Unvalidated `{ query, channel, feedbackReason }` payload; contacts are never accepted.
   * @returns Inserted insight with `open` status.
   */
  async reportInsight(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiQueryInsightRow, PublicErrorEnvelope>> {
    const parsed = aiInsightReportSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the feedback fields.', actor.requestId) };
    if (!this.canReport(actor)) return this.denied(actor, 'ai.insight.report.denied');
    try {
      const value = await this.repository.createInsight(actor, {
        query: parsed.data.query,
        channel: parsed.data.channel,
        ...(parsed.data.feedbackReason === undefined ? {} : { feedbackReason: parsed.data.feedbackReason }),
        now: this.clock.now().toISOString(),
      });
      return { ok: true, value };
    } catch {
      return this.failure(actor, 'The feedback could not be recorded.');
    }
  }

  /**
   * Mark an insight as resolved.
   *
   * @param actor - Tenant actor; requires the platform AI grant.
   * @param raw - Unvalidated `{ id }` payload.
   * @returns Updated insight.
   */
  async resolveInsight(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AiQueryInsightRow, PublicErrorEnvelope>> {
    const parsed = aiInsightResolveSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the insight fields.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'ai.insight.resolve.denied');
    try {
      const updated = await this.repository.resolveInsight(actor, parsed.data.id);
      if (updated === null) return this.denied(actor, 'ai.insight.resolve.denied');
      return { ok: true, value: updated };
    } catch {
      return this.failure(actor, 'The insight could not be resolved.');
    }
  }
}
