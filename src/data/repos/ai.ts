import { desc, eq, gte, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { aiCredentials, aiMasterSecrets, aiModels, aiProviders, aiQueryInsights, aiRequestLogs, aiRoutingPolicies } from '@/data/schema/ai';
import { runtimeConfigAuditLogs } from '@/data/schema/runtime-config';
import type * as schema from '@/data/schema';
import type {
  AiChainStrategy,
  AiCostMode,
  AiCredentialProjection,
  AiCredentialStatus,
  AiMasterStatus,
  AiModelEntry,
  AiOrgTokenUsage,
  AiProviderEntry,
  AiQueryInsightRow,
  AiRequestLogRow,
  AiRoutingPolicy,
} from '@/modules/integrations/ai-models';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const CREDENTIAL_LIST_MAX_ROWS = 200;
const MODEL_LIST_MAX_ROWS = 50;
const PROVIDER_LIST_MAX_ROWS = 50;
const LOG_LIST_MAX_ROWS = 50;
const INSIGHT_LIST_MAX_ROWS = 50;
const TOKEN_USAGE_ORG_MAX_ROWS = 25;

type AuditEnvironment = 'development' | 'test' | 'production';

function resolveAuditEnvironment(): AuditEnvironment {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

const iso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : value);
const optionalIso = (value: Date | string | null): string | null => (value === null ? null : iso(value));

function toCredentialStatus(value: string): AiCredentialStatus {
  if (value === 'inactive' || value === 'disabled' || value === 'exhausted' || value === 'invalid' || value === 'cooldown') return value;
  return 'active';
}

const credentialProjection = {
  id: aiCredentials.id,
  providerId: aiCredentials.providerId,
  label: aiCredentials.label,
  keyMasked: aiCredentials.keyMasked,
  status: aiCredentials.status,
  priority: aiCredentials.priority,
  cooldownUntil: aiCredentials.cooldownUntil,
  lastUsedAt: aiCredentials.lastUsedAt,
  lastSuccessAt: aiCredentials.lastSuccessAt,
  lastFailureAt: aiCredentials.lastFailureAt,
  lastErrorClass: aiCredentials.lastErrorClass,
  totalRequests: aiCredentials.totalRequests,
  successfulRequests: aiCredentials.successfulRequests,
  failedRequests: aiCredentials.failedRequests,
  avgLatencyMs: aiCredentials.avgLatencyMs,
  createdAt: aiCredentials.createdAt,
  updatedAt: aiCredentials.updatedAt,
};

interface CredentialProjectionRow {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly keyMasked: string;
  readonly status: string;
  readonly priority: number;
  readonly cooldownUntil: Date | null;
  readonly lastUsedAt: Date | null;
  readonly lastSuccessAt: Date | null;
  readonly lastFailureAt: Date | null;
  readonly lastErrorClass: string | null;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly avgLatencyMs: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function mapCredential(row: CredentialProjectionRow): AiCredentialProjection {
  return {
    id: row.id,
    providerId: row.providerId,
    label: row.label,
    keyMasked: row.keyMasked,
    status: toCredentialStatus(row.status),
    priority: row.priority,
    cooldownUntil: optionalIso(row.cooldownUntil),
    lastUsedAt: optionalIso(row.lastUsedAt),
    lastSuccessAt: optionalIso(row.lastSuccessAt),
    lastFailureAt: optionalIso(row.lastFailureAt),
    lastErrorClass: row.lastErrorClass,
    totalRequests: row.totalRequests,
    successfulRequests: row.successfulRequests,
    failedRequests: row.failedRequests,
    avgLatencyMs: row.avgLatencyMs,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export class DrizzleAiRepository {
  constructor(private readonly database: Database) {}

  private async actorContext(tx: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    await tx.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
    if (actor.actorType === 'user' && actor.verifiedAuthUserId !== undefined) {
      await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
    }
    await tx.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`);
  }

  private async audit(
    tx: Transaction,
    actor: AuthorizedTenantActorContext,
    action: string,
    targetType: string,
    targetId: string | null,
    changedFields: readonly string[],
    outcome: 'succeeded' | 'denied',
  ): Promise<void> {
    await tx.insert(runtimeConfigAuditLogs).values({
      id: crypto.randomUUID(),
      organizationId: actor.organizationId,
      actorType: actor.actorType === 'user' ? 'user' : actor.actorType === 'api_key' ? 'api_key' : 'system',
      actorId: actor.actorType === 'user' ? (actor.verifiedAuthUserId ?? null) : null,
      environment: resolveAuditEnvironment(),
      action,
      targetType,
      targetId,
      changedFields: [...changedFields],
      outcome,
      requestId: actor.requestId,
    });
  }

  async listCredentials(actor: AuthorizedTenantActorContext): Promise<readonly AiCredentialProjection[]> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select(credentialProjection)
        .from(aiCredentials)
        .orderBy(aiCredentials.priority, desc(aiCredentials.createdAt))
        .limit(CREDENTIAL_LIST_MAX_ROWS);
    });
    return rows.map(mapCredential);
  }

  async createCredential(
    actor: AuthorizedTenantActorContext,
    input: { readonly label: string; readonly plainKey: string; readonly priority: number; readonly keyMasked: string; readonly providerId: string; readonly now: string },
  ): Promise<AiCredentialProjection> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const encrypted = await tx.execute<{ cipher: string }>(sql`SELECT indicate_private.encrypt_ai_key(${input.plainKey}) AS cipher`);
      const cipher = encrypted[0]?.cipher;
      if (typeof cipher !== 'string' || cipher === '') throw new Error('AI key envelope encryption failed.');
      const rows = await tx
        .insert(aiCredentials)
        .values({
          organizationId: null,
          providerId: input.providerId,
          label: input.label,
          keyEncrypted: cipher,
          keyMasked: input.keyMasked,
          status: 'active',
          priority: input.priority,
          createdAt: new Date(input.now),
          updatedAt: new Date(input.now),
        })
        .returning(credentialProjection);
      const row = rows[0] as CredentialProjectionRow | undefined;
      if (row === undefined) throw new Error('AI credential insert returned no row.');
      await this.audit(tx, actor, 'ai.credential.create', 'ai_credential', row.id, ['label', 'priority', 'providerId'], 'succeeded');
      return mapCredential(row);
    });
  }

  async updateCredentialStatus(
    actor: AuthorizedTenantActorContext,
    credentialId: string,
    status: AiCredentialStatus,
    cooldownUntil: string | null,
    now: string,
  ): Promise<AiCredentialProjection | null> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const rows = await tx
        .update(aiCredentials)
        .set({ status, cooldownUntil: cooldownUntil === null ? null : new Date(cooldownUntil), updatedAt: new Date(now) })
        .where(eq(aiCredentials.id, credentialId))
        .returning(credentialProjection);
      const row = rows[0] as CredentialProjectionRow | undefined;
      if (row === undefined) return null;
      await this.audit(tx, actor, 'ai.credential.status', 'ai_credential', row.id, ['status'], 'succeeded');
      return mapCredential(row);
    });
  }

  async deleteCredential(actor: AuthorizedTenantActorContext, credentialId: string): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const rows = await tx.delete(aiCredentials).where(eq(aiCredentials.id, credentialId)).returning({ id: aiCredentials.id });
      if (rows[0] === undefined) return false;
      await this.audit(tx, actor, 'ai.credential.delete', 'ai_credential', credentialId, ['id'], 'succeeded');
      return true;
    });
  }

  async decryptCredentialKey(actor: AuthorizedTenantActorContext, credentialId: string): Promise<string | null> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const rows = await tx
        .select({ keyEncrypted: aiCredentials.keyEncrypted })
        .from(aiCredentials)
        .where(eq(aiCredentials.id, credentialId))
        .limit(1);
      const cipher = rows[0]?.keyEncrypted;
      if (typeof cipher !== 'string' || cipher === '') return null;
      const decrypted = await tx.execute<{ plain: string }>(sql`SELECT indicate_private.decrypt_ai_key(${cipher}) AS plain`);
      const plain = decrypted[0]?.plain;
      return typeof plain === 'string' && plain !== '' ? plain : null;
    });
  }

  async recordCredentialTest(
    actor: AuthorizedTenantActorContext,
    credentialId: string,
    ok: boolean,
    latencyMs: number,
    errorClass: string | null,
    errorMessage: string | null,
    now: string,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const current = await tx
        .select({ totalRequests: aiCredentials.totalRequests, successfulRequests: aiCredentials.successfulRequests, failedRequests: aiCredentials.failedRequests, avgLatencyMs: aiCredentials.avgLatencyMs })
        .from(aiCredentials)
        .where(eq(aiCredentials.id, credentialId))
        .limit(1);
      const row = current[0];
      if (row === undefined) return;
      const total = row.totalRequests + 1;
      const avg = Math.round((row.avgLatencyMs * row.totalRequests + latencyMs) / total);
      const stamp = new Date(now);
      if (ok) {
        await tx
          .update(aiCredentials)
          .set({
            totalRequests: total,
            successfulRequests: row.successfulRequests + 1,
            avgLatencyMs: avg,
            lastUsedAt: stamp,
            lastSuccessAt: stamp,
            lastErrorClass: null,
            lastErrorMessage: null,
            updatedAt: stamp,
          })
          .where(eq(aiCredentials.id, credentialId));
      } else {
        await tx
          .update(aiCredentials)
          .set({
            totalRequests: total,
            failedRequests: row.failedRequests + 1,
            avgLatencyMs: avg,
            lastUsedAt: stamp,
            lastFailureAt: stamp,
            lastErrorClass: errorClass,
            lastErrorMessage: errorMessage?.slice(0, 500) ?? null,
            updatedAt: stamp,
          })
          .where(eq(aiCredentials.id, credentialId));
      }
      await this.audit(tx, actor, 'ai.credential.test', 'ai_credential', credentialId, ['lastUsedAt'], 'succeeded');
    });
  }

  async recordBlockedCredential(actor: AuthorizedTenantActorContext, credentialId: string, errorClass: string, cooldownUntil: string, now: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      await tx
        .update(aiCredentials)
        .set({
          status: 'cooldown',
          cooldownUntil: new Date(cooldownUntil),
          lastErrorClass: errorClass,
          updatedAt: new Date(now),
        })
        .where(eq(aiCredentials.id, credentialId));
      await this.audit(tx, actor, 'ai.credential.cooldown', 'ai_credential', credentialId, ['status'], 'succeeded');
    });
  }

  async getPolicy(actor: AuthorizedTenantActorContext): Promise<AiRoutingPolicy | null> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          rotationStrategy: aiRoutingPolicies.rotationStrategy,
          chainStrategy: aiRoutingPolicies.chainStrategy,
          costMode: aiRoutingPolicies.costMode,
          primaryProviderId: aiRoutingPolicies.primaryProviderId,
          defaultModel: aiRoutingPolicies.defaultModel,
          fallbackProviderId: aiRoutingPolicies.fallbackProviderId,
          fallbackModel: aiRoutingPolicies.fallbackModel,
          maxRetries: aiRoutingPolicies.maxRetries,
          perKeyRetryLimit: aiRoutingPolicies.perKeyRetryLimit,
          cooldownDurationSec: aiRoutingPolicies.cooldownDurationSec,
          requestTimeoutMs: aiRoutingPolicies.requestTimeoutMs,
          globalConcurrencyLimit: aiRoutingPolicies.globalConcurrencyLimit,
          version: aiRoutingPolicies.version,
          updatedAt: aiRoutingPolicies.updatedAt,
        })
        .from(aiRoutingPolicies)
        .where(eq(aiRoutingPolicies.id, 'default'))
        .limit(1);
    });
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      rotationStrategy: row.rotationStrategy,
      chainStrategy: row.chainStrategy === 'round_robin' ? row.chainStrategy satisfies AiChainStrategy : 'fallback',
      costMode: row.costMode === 'price' ? row.costMode satisfies AiCostMode : 'throughput',
      primaryProviderId: row.primaryProviderId,
      defaultModel: row.defaultModel,
      fallbackProviderId: row.fallbackProviderId,
      fallbackModel: row.fallbackModel,
      maxRetries: row.maxRetries,
      perKeyRetryLimit: row.perKeyRetryLimit,
      cooldownDurationSec: row.cooldownDurationSec,
      requestTimeoutMs: row.requestTimeoutMs,
      globalConcurrencyLimit: row.globalConcurrencyLimit,
      version: row.version,
      updatedAt: iso(row.updatedAt),
    };
  }

  async upsertPolicy(
    actor: AuthorizedTenantActorContext,
    input: { readonly rotationStrategy: AiRoutingPolicy['rotationStrategy']; readonly chainStrategy: AiChainStrategy; readonly costMode: AiCostMode; readonly primaryProviderId: string | null; readonly defaultModel: string; readonly fallbackProviderId: string | null; readonly fallbackModel: string; readonly maxRetries: number; readonly perKeyRetryLimit: number; readonly cooldownDurationSec: number; readonly requestTimeoutMs: number; readonly globalConcurrencyLimit: number; readonly now: string },
  ): Promise<AiRoutingPolicy> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const existing = await tx
        .select({ primaryProviderId: aiRoutingPolicies.primaryProviderId, version: aiRoutingPolicies.version })
        .from(aiRoutingPolicies)
        .where(eq(aiRoutingPolicies.id, 'default'))
        .limit(1);
      const prior = existing[0];
      const version = (prior?.version ?? 0) + 1;
      const primaryProviderId = input.primaryProviderId ?? prior?.primaryProviderId ?? null;
      const rows = await tx
        .insert(aiRoutingPolicies)
        .values({
          id: 'default',
          rotationStrategy: input.rotationStrategy,
          chainStrategy: input.chainStrategy,
          costMode: input.costMode,
          primaryProviderId,
          defaultModel: input.defaultModel,
          fallbackProviderId: input.fallbackProviderId,
          fallbackModel: input.fallbackModel,
          maxRetries: input.maxRetries,
          perKeyRetryLimit: input.perKeyRetryLimit,
          cooldownDurationSec: input.cooldownDurationSec,
          requestTimeoutMs: input.requestTimeoutMs,
          globalConcurrencyLimit: input.globalConcurrencyLimit,
          version,
          updatedAt: new Date(input.now),
        })
        .onConflictDoUpdate({
          target: aiRoutingPolicies.id,
          set: {
            rotationStrategy: input.rotationStrategy,
            chainStrategy: input.chainStrategy,
            costMode: input.costMode,
            primaryProviderId,
            defaultModel: input.defaultModel,
            fallbackProviderId: input.fallbackProviderId,
            fallbackModel: input.fallbackModel,
            maxRetries: input.maxRetries,
            perKeyRetryLimit: input.perKeyRetryLimit,
            cooldownDurationSec: input.cooldownDurationSec,
            requestTimeoutMs: input.requestTimeoutMs,
            globalConcurrencyLimit: input.globalConcurrencyLimit,
            version,
            updatedAt: new Date(input.now),
          },
        })
        .returning({
          rotationStrategy: aiRoutingPolicies.rotationStrategy,
          chainStrategy: aiRoutingPolicies.chainStrategy,
          costMode: aiRoutingPolicies.costMode,
          primaryProviderId: aiRoutingPolicies.primaryProviderId,
          defaultModel: aiRoutingPolicies.defaultModel,
          fallbackProviderId: aiRoutingPolicies.fallbackProviderId,
          fallbackModel: aiRoutingPolicies.fallbackModel,
          maxRetries: aiRoutingPolicies.maxRetries,
          perKeyRetryLimit: aiRoutingPolicies.perKeyRetryLimit,
          cooldownDurationSec: aiRoutingPolicies.cooldownDurationSec,
          requestTimeoutMs: aiRoutingPolicies.requestTimeoutMs,
          globalConcurrencyLimit: aiRoutingPolicies.globalConcurrencyLimit,
          version: aiRoutingPolicies.version,
          updatedAt: aiRoutingPolicies.updatedAt,
        });
      const row = rows[0];
      if (row === undefined) throw new Error('AI policy upsert returned no row.');
      await this.audit(tx, actor, 'ai.policy.update', 'ai_routing_policy', 'default', ['rotationStrategy', 'chainStrategy', 'costMode', 'primaryProviderId', 'defaultModel', 'fallbackProviderId', 'fallbackModel', 'maxRetries', 'perKeyRetryLimit', 'cooldownDurationSec', 'requestTimeoutMs', 'globalConcurrencyLimit'], 'succeeded');
      return {
        rotationStrategy: row.rotationStrategy,
        chainStrategy: row.chainStrategy === 'round_robin' ? row.chainStrategy satisfies AiChainStrategy : 'fallback',
        costMode: row.costMode === 'price' ? row.costMode satisfies AiCostMode : 'throughput',
        primaryProviderId: row.primaryProviderId,
        defaultModel: row.defaultModel,
        fallbackProviderId: row.fallbackProviderId,
        fallbackModel: row.fallbackModel,
        maxRetries: row.maxRetries,
        perKeyRetryLimit: row.perKeyRetryLimit,
        cooldownDurationSec: row.cooldownDurationSec,
        requestTimeoutMs: row.requestTimeoutMs,
        globalConcurrencyLimit: row.globalConcurrencyLimit,
        version: row.version,
        updatedAt: iso(row.updatedAt),
      };
    });
  }

  async listProviders(actor: AuthorizedTenantActorContext): Promise<readonly AiProviderEntry[]> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({ id: aiProviders.id, name: aiProviders.name, isActive: aiProviders.isActive, supportsChat: aiProviders.supportsChat })
        .from(aiProviders)
        .orderBy(aiProviders.priority)
        .limit(PROVIDER_LIST_MAX_ROWS);
    });
    return rows.map((row) => ({ id: row.id, name: row.name, isActive: row.isActive, supportsChat: row.supportsChat }));
  }

  async listModels(actor: AuthorizedTenantActorContext): Promise<readonly AiModelEntry[]> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          id: aiModels.id,
          providerId: aiModels.providerId,
          modelName: aiModels.modelName,
          displayName: aiModels.displayName,
          releaseStage: aiModels.releaseStage,
          contextWindow: aiModels.contextWindow,
          outputTokenLimit: aiModels.outputTokenLimit,
          supportedModalities: aiModels.supportedModalities,
          rpmLimit: aiModels.rpmLimit,
          tpmLimit: aiModels.tpmLimit,
          rpdLimit: aiModels.rpdLimit,
          supportsTools: aiModels.supportsTools,
          isDefault: aiModels.isDefault,
          isActive: aiModels.isActive,
        })
        .from(aiModels)
        .where(eq(aiModels.isActive, true))
        .orderBy(aiModels.priority)
        .limit(MODEL_LIST_MAX_ROWS);
    });
    return rows.map((row) => ({
      id: row.id,
      providerId: row.providerId,
      modelName: row.modelName,
      displayName: row.displayName,
      releaseStage: row.releaseStage,
      contextWindow: row.contextWindow,
      outputTokenLimit: row.outputTokenLimit,
      supportedModalities: [...row.supportedModalities],
      rpmLimit: row.rpmLimit,
      tpmLimit: row.tpmLimit,
      rpdLimit: row.rpdLimit,
      supportsTools: row.supportsTools,
      isDefault: row.isDefault,
      isActive: row.isActive,
    }));
  }

  async listAllModels(actor: AuthorizedTenantActorContext): Promise<readonly AiModelEntry[]> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          id: aiModels.id,
          providerId: aiModels.providerId,
          modelName: aiModels.modelName,
          displayName: aiModels.displayName,
          releaseStage: aiModels.releaseStage,
          contextWindow: aiModels.contextWindow,
          outputTokenLimit: aiModels.outputTokenLimit,
          supportedModalities: aiModels.supportedModalities,
          rpmLimit: aiModels.rpmLimit,
          tpmLimit: aiModels.tpmLimit,
          rpdLimit: aiModels.rpdLimit,
          supportsTools: aiModels.supportsTools,
          isDefault: aiModels.isDefault,
          isActive: aiModels.isActive,
        })
        .from(aiModels)
        .orderBy(desc(aiModels.isActive), aiModels.priority)
        .limit(MODEL_LIST_MAX_ROWS);
    });
    return rows.map((row) => ({
      id: row.id,
      providerId: row.providerId,
      modelName: row.modelName,
      displayName: row.displayName,
      releaseStage: row.releaseStage,
      contextWindow: row.contextWindow,
      outputTokenLimit: row.outputTokenLimit,
      supportedModalities: [...row.supportedModalities],
      rpmLimit: row.rpmLimit,
      tpmLimit: row.tpmLimit,
      rpdLimit: row.rpdLimit,
      supportsTools: row.supportsTools,
      isDefault: row.isDefault,
      isActive: row.isActive,
    }));
  }

  async updateModelActive(
    actor: AuthorizedTenantActorContext,
    modelId: string,
    isActive: boolean,
    now: string,
  ): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const rows = await tx
        .update(aiModels)
        .set({ isActive, updatedAt: new Date(now) })
        .where(eq(aiModels.id, modelId))
        .returning({ id: aiModels.id });
      if (rows[0] === undefined) return false;
      await this.audit(tx, actor, 'ai.model.status', 'ai_model', modelId, ['isActive'], 'succeeded');
      return true;
    });
  }

  async listRequestLogs(actor: AuthorizedTenantActorContext): Promise<readonly AiRequestLogRow[]> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          id: aiRequestLogs.id,
          channel: aiRequestLogs.channel,
          modelName: aiRequestLogs.modelName,
          status: aiRequestLogs.status,
          latencyMs: aiRequestLogs.latencyMs,
          totalTokens: aiRequestLogs.totalTokens,
          toolsExecuted: aiRequestLogs.toolsExecuted,
          createdAt: aiRequestLogs.createdAt,
        })
        .from(aiRequestLogs)
        .orderBy(desc(aiRequestLogs.createdAt))
        .limit(LOG_LIST_MAX_ROWS);
    });
    return rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      modelName: row.modelName,
      status: row.status === 'failed' ? 'failed' as const : row.status === 'blocked' ? 'blocked' as const : 'success' as const,
      latencyMs: row.latencyMs,
      totalTokens: row.totalTokens,
      toolsExecuted: row.toolsExecuted === null ? [] : [...row.toolsExecuted],
      createdAt: iso(row.createdAt),
    }));
  }

  /**
   * Summarize token consumption per organization over a trailing window.
   *
   * @param actor - Tenant actor; the aggregate is control-plane wide.
   * @param days - Trailing window, 7 or 30 days.
   * @returns At most 25 rows ordered by tokens descending.
   */
  async getTokenUsageByOrg(actor: AuthorizedTenantActorContext, days: 7 | 30 = 7): Promise<readonly AiOrgTokenUsage[]> {
    const windowDays = days === 30 ? 30 : 7;
    const since = new Date(Date.now() - windowDays * 86400_000);
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          organizationId: aiRequestLogs.organizationId,
          requests: sql<number>`count(*)`,
          tokens: sql<number>`coalesce(sum(${aiRequestLogs.totalTokens}), 0)`,
          blocked: sql<number>`count(*) filter (where ${aiRequestLogs.status} = 'blocked')`,
        })
        .from(aiRequestLogs)
        .where(gte(aiRequestLogs.createdAt, since))
        .groupBy(aiRequestLogs.organizationId)
        .orderBy(desc(sql`coalesce(sum(${aiRequestLogs.totalTokens}), 0)`))
        .limit(TOKEN_USAGE_ORG_MAX_ROWS);
    });
    return rows.map((row) => ({
      organizationId: row.organizationId,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
      blocked: Number(row.blocked),
    }));
  }

  async listQueryInsights(actor: AuthorizedTenantActorContext): Promise<readonly AiQueryInsightRow[]> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          id: aiQueryInsights.id,
          query: aiQueryInsights.query,
          channel: aiQueryInsights.channel,
          status: aiQueryInsights.status,
          feedbackReason: aiQueryInsights.feedbackReason,
          createdAt: aiQueryInsights.createdAt,
        })
        .from(aiQueryInsights)
        .orderBy(desc(aiQueryInsights.createdAt))
        .limit(INSIGHT_LIST_MAX_ROWS);
    });
    return rows.map((row) => ({
      id: row.id,
      query: row.query,
      channel: row.channel,
      status: row.status === 'resolved' ? 'resolved' as const : 'open' as const,
      feedbackReason: row.feedbackReason,
      createdAt: iso(row.createdAt),
    }));
  }

  async getMasterStatus(actor: AuthorizedTenantActorContext): Promise<AiMasterStatus> {
    const rows = await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      return tx
        .select({
          version: aiMasterSecrets.version,
          fingerprint: sql<string>`substring(encode(digest(${aiMasterSecrets.secret}, 'sha256'), 'hex'), 1, 8)`,
          rotatedAt: aiMasterSecrets.rotatedAt,
          createdAt: aiMasterSecrets.createdAt,
        })
        .from(aiMasterSecrets)
        .where(eq(aiMasterSecrets.isActive, true))
        .limit(1);
    });
    const row = rows[0];
    if (row === undefined) {
      return { provisioned: false, version: null, fingerprint: null, rotatedAt: null, createdAt: null };
    }
    return {
      provisioned: true,
      version: row.version,
      fingerprint: typeof row.fingerprint === 'string' ? row.fingerprint : null,
      rotatedAt: row.rotatedAt === null ? null : iso(row.rotatedAt),
      createdAt: iso(row.createdAt),
    };
  }

  async provisionMaster(
    actor: AuthorizedTenantActorContext,
    input: { readonly secretPlain: string; readonly rotate: boolean; readonly expectedVersion?: number | undefined; readonly now: string },
  ): Promise<number> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const active = await tx
        .select({ id: aiMasterSecrets.id, version: aiMasterSecrets.version })
        .from(aiMasterSecrets)
        .where(eq(aiMasterSecrets.isActive, true))
        .limit(1);
      const current = active[0];
      if (current !== undefined && !input.rotate) {
        throw new Error('AI_MASTER_CONFLICT');
      }
      if (current !== undefined && input.rotate) {
        if (input.expectedVersion === undefined || input.expectedVersion !== current.version) {
          throw new Error('AI_MASTER_CONFLICT');
        }
        const stamp = new Date(input.now);
        await tx
          .update(aiMasterSecrets)
          .set({ isActive: false, rotatedAt: stamp, updatedAt: stamp })
          .where(eq(aiMasterSecrets.id, current.id));
      }
      const version = current === undefined ? 1 : current.version + 1;
      const stamp = new Date(input.now);
      const inserted = await tx
        .insert(aiMasterSecrets)
        .values({ secret: input.secretPlain, version, isActive: true, createdAt: stamp, updatedAt: stamp })
        .returning({ version: aiMasterSecrets.version });
      const row = inserted[0];
      if (row === undefined) throw new Error('AI master insert returned no row.');
      await this.audit(tx, actor, 'ai.master.provision', 'ai_master_secret', null, ['version'], 'succeeded');
      return row.version;
    });
  }

  async createInsight(
    actor: AuthorizedTenantActorContext,
    input: { readonly query: string; readonly channel: string; readonly feedbackReason?: string | undefined; readonly now: string },
  ): Promise<AiQueryInsightRow> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const rows = await tx
        .insert(aiQueryInsights)
        .values({
          query: input.query,
          channel: input.channel,
          status: 'open',
          feedbackReason: input.feedbackReason ?? null,
          createdAt: new Date(input.now),
        })
        .returning({
          id: aiQueryInsights.id,
          query: aiQueryInsights.query,
          channel: aiQueryInsights.channel,
          status: aiQueryInsights.status,
          feedbackReason: aiQueryInsights.feedbackReason,
          createdAt: aiQueryInsights.createdAt,
        });
      const row = rows[0];
      if (row === undefined) throw new Error('AI insight insert returned no row.');
      await this.audit(tx, actor, 'ai.insight.report', 'ai_query_insight', row.id, ['query'], 'succeeded');
      return {
        id: row.id,
        query: row.query,
        channel: row.channel,
        status: row.status === 'resolved' ? 'resolved' as const : 'open' as const,
        feedbackReason: row.feedbackReason,
        createdAt: iso(row.createdAt),
      };
    });
  }

  async resolveInsight(actor: AuthorizedTenantActorContext, id: string): Promise<AiQueryInsightRow | null> {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      const rows = await tx
        .update(aiQueryInsights)
        .set({ status: 'resolved' })
        .where(eq(aiQueryInsights.id, id))
        .returning({
          id: aiQueryInsights.id,
          query: aiQueryInsights.query,
          channel: aiQueryInsights.channel,
          status: aiQueryInsights.status,
          feedbackReason: aiQueryInsights.feedbackReason,
          createdAt: aiQueryInsights.createdAt,
        });
      const row = rows[0];
      if (row === undefined) return null;
      await this.audit(tx, actor, 'ai.insight.resolve', 'ai_query_insight', row.id, ['status'], 'succeeded');
      return {
        id: row.id,
        query: row.query,
        channel: row.channel,
        status: row.status === 'resolved' ? 'resolved' as const : 'open' as const,
        feedbackReason: row.feedbackReason,
        createdAt: iso(row.createdAt),
      };
    });
  }

  async recordDenial(actor: AuthorizedTenantActorContext, action: string): Promise<void> {
    try {
      await this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        await tx.insert(runtimeConfigAuditLogs).values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorType: actor.actorType === 'user' ? 'user' : actor.actorType === 'api_key' ? 'api_key' : 'system',
          actorId: actor.actorType === 'user' ? (actor.verifiedAuthUserId ?? null) : null,
          environment: resolveAuditEnvironment(),
          action,
          targetType: 'ai_credential',
          changedFields: [],
          outcome: 'denied',
          requestId: actor.requestId,
        });
      });
    } catch {
      /* denial remains non-disclosing when audit storage is unavailable */
    }
  }
}

/** Structural database port for the per-organization token rollup. */
export interface AiTokenRollupDb {
  readonly execute: (query: SQL) => Promise<unknown>;
}

/** Token consumption of one organization for one model. */
export interface AiModelTokenUsage {
  readonly modelName: string;
  readonly requests: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/** Upper bound for per-model rows returned by the rollup. */
export const ORG_TOKEN_USAGE_MODEL_MAX_ROWS = 50;

function toTokenCount(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * Aggregate token consumption of one organization per model since a cutoff.
 *
 * @param db - Database port executing one grouped aggregate query.
 * @param organizationId - Tenant whose `ai_request_logs` rows are summed.
 * @param since - Inclusive lower bound for `created_at`.
 * @returns At most 50 rows ordered by total tokens descending.
 */
export async function getOrganizationTokenUsage(
  db: AiTokenRollupDb,
  organizationId: string,
  since: Date | string,
): Promise<readonly AiModelTokenUsage[]> {
  const sinceDate = since instanceof Date ? since : new Date(since);
  const value = await db.execute(sql`select model_name, count(*) as requests,
    coalesce(sum(prompt_tokens), 0) as prompt_tokens,
    coalesce(sum(completion_tokens), 0) as completion_tokens,
    coalesce(sum(total_tokens), 0) as total_tokens
    from ai_request_logs
    where organization_id = ${organizationId} and created_at >= ${sinceDate}
    group by model_name
    order by coalesce(sum(total_tokens), 0) desc
    limit ${ORG_TOKEN_USAGE_MODEL_MAX_ROWS}`);
  const rows = Array.isArray(value) ? value : [];
  return (rows as readonly Record<string, unknown>[]).map((row) => ({
    modelName: typeof row.model_name === 'string' ? row.model_name : '',
    requests: toTokenCount(row.requests),
    promptTokens: toTokenCount(row.prompt_tokens),
    completionTokens: toTokenCount(row.completion_tokens),
    totalTokens: toTokenCount(row.total_tokens),
  }));
}
