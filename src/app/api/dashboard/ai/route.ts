import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import type { ActorContext } from '@/core/operation-context';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { configureAiUsage, buildDraftArticleInput, draftModerationReply, generateArticleDraft, narrateInsights, ocCoverCaption, ocVisionDraft, scanPrompt, suggestTags, summarizeReport } from '@/modules/ai/ai-usage';
import { configureAiSeo, suggestExcerpt, suggestMetaDescription, suggestSeoBundle, suggestTitles } from '@/modules/ai/ai-seo';
import { classifyArticle, polishBody } from '@/modules/ai/ai-polish';
import { configureAiCover, generateCoverImage } from '@/modules/ai/ai-cover';
import { configureAiTts, synthesizeSpeech } from '@/modules/ai/ai-tts';
import { configureAiTranscribe, transcribeAudio, transcribeToArticle } from '@/modules/ai/ai-transcribe';
import { configurePublisherVerify, verifyPublisher } from '@/modules/ai/ai-verify';
import { configureAiAssistant, assistantChat } from '@/modules/ai/ai-assistant';
import { ARTICLE_DRAFT_SCHEMA } from '@/modules/ai/ai-response-schemas';
import { createAiSemanticCache } from '@/modules/ai/ai-semantic-cache';
import { SEMANTIC_CANDIDATE_LIMIT, embedQueryVector, reindexArticleEmbeddings, toSemanticCandidate, type WorkersAiCredentials } from '@/modules/ai/ai-embeddings';
import type { AiDb } from '@/modules/ai/ai-types';
import type { AiAdapterResult, AiServiceDeps } from '@/modules/ai/ai-service';
import { acquireAiGlobalSlot, computeRetryDelayMs, normalizeCachePrompt, releaseAiGlobalSlot } from '@/modules/ai/ai-service';
import {
  AI_EMBED_OPERATION_QUERY,
  AI_EMBED_OPERATION_REINDEX,
  checkOperationBudgetQuota,
  type AiOperationControls,
} from '@/modules/ai/ai-operation-guards';
import type { AiChatPrompt as ServicePrompt } from '@/modules/ai/ai-types';
import { createAiBudgetGuard, redactSecrets } from '@/modules/ai/ai-security';
import { checkAiModelRateLimit, createAiModelRateLimitStore, estimateAiInputTokens, getAiModelLimits } from '@/modules/ai/ai-rate-limit';
import { resolveCloudflareGatewayConfig, type CloudflareGatewayConfig } from '@/integrations/ai/gateway/cloudflare/cloudflare-gateway';
import { GeminiAdapterWrapper, getAiAdapter } from '@/integrations/ai/adapter-registry';
import { executeGeminiStream } from '@/integrations/ai/gemini-adapter';
import { createVercelGatewayBudgetGuard, vercelGatewayBudgetScope } from '@/integrations/ai/gateway/vercel/vercel-gateway';
import { rankSemanticCandidates, type SemanticCandidate } from '@/integrations/ai/embeddings';
import { decryptAiKey } from '@/modules/ai/ai-crypto';
import { AI_BREAKER_ERROR_CLASSES, classifyAiError, getActiveRoutingPolicy, getAvailableCredentials, isModelBreakerTripped, nextChainStartIndex, recordKeyFailure, recordKeySuccess, recordModelInfraFailure, recordModelSuccess, resolveCascadeChain, resolveOrderedAiModelChain } from '@/modules/ai/ai-router';
import type { AiChatPrompt as AdapterPrompt } from '@/integrations/ai/ai-prompt';

const commandSchema = z.object({
  organizationId: z.uuid(),
  action: z.enum([
    'draft-article',
    'draft-article-stream',
    'suggest-tags',
    'summarize-report',
    'moderation-reply',
    'vision-draft',
    'cover-caption',
    'insight-narrative',
    'semantic-search',
    'embeddings-reindex',
    'seo-titles',
    'seo-meta',
    'seo-excerpt',
    'seo-bundle',
    'polish-body',
    'classify-article',
    'cover-image',
    'tts-speak',
    'transcribe-audio',
    'transcribe-to-article',
    'publisher-verify',
    'assistant-chat',
  ]),
  payload: z.record(z.string(), z.unknown()),
}).strict();

const str = (value: unknown, max: number): string => typeof value === 'string' ? value.slice(0, max) : '';

function response(error: PublicErrorEnvelope) {
  const status = error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
  return NextResponse.json(error, { status });
}

/** Cloudflare gateway resolved inside `serviceDeps`, forwarded to the stream without re-reading runtime context. */
const gatewayByDeps = new WeakMap<AiServiceDeps, CloudflareGatewayConfig | null>();

/** Stream-capable adapter shape provided by another stream; probed with a runtime type-guard. */
interface StreamCapableAdapter {
  readonly executeStream?: (
    plainKey: string,
    modelName: string,
    promptData: AdapterPrompt,
    options?: { readonly signal?: AbortSignal | undefined; readonly onChunk?: ((delta: string) => void) | undefined },
  ) => Promise<AiAdapterResult>;
}

/**
 * Returns the adapter when it supports streaming, null otherwise.
 *
 * @param adapter - Resolved provider adapter; may predate `executeStream`.
 * @returns Typed streaming view, or null when only single-shot `execute` exists.
 */
export function asStreamCapableAdapter(adapter: { readonly execute: unknown }): StreamCapableAdapter | null {
  const candidate = adapter as Partial<StreamCapableAdapter>;
  return typeof candidate.executeStream === 'function' ? (candidate as StreamCapableAdapter) : null;
}

async function serviceDeps(organizationId?: string | undefined, context?: ServerRuntimeContext | undefined): Promise<AiServiceDeps> {
  const resolved = context ?? await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(resolved.bootstrap);
  const redis = resolved.config.redis;
  const gateway: CloudflareGatewayConfig | null = resolveCloudflareGatewayConfig({
    accountId: resolved.config.cloudflare.accountId,
    gatewaySlug: resolved.config.cloudflare.aiGatewaySlug,
    ...(resolved.config.cloudflare.aiGatewayCacheTtlSeconds === null
      ? {}
      : { cacheTtlSeconds: resolved.config.cloudflare.aiGatewayCacheTtlSeconds }),
  });
  const vercelBudget = createVercelGatewayBudgetGuard({ url: redis.url, token: redis.token, namespace: redis.namespace });
  const deps: AiServiceDeps = {
    db: runtime.db,
    budget: createAiBudgetGuard({ url: redis.url, token: redis.token, namespace: redis.namespace }),
    rateLimit: { store: createAiModelRateLimitStore({ url: redis.url, token: redis.token, namespace: redis.namespace }) },
    cache: createAiSemanticCache(runtime.db, { organizationId: organizationId ?? null }),
    resolveAdapter: (providerId: string) => {
      const inner = providerId === 'gemini' && gateway !== null ? new GeminiAdapterWrapper(gateway) : getAiAdapter(providerId);
      return {
        execute: async (apiKey: string, modelName: string, prompt: ServicePrompt) => {
          if (providerId === 'vercel-gateway') {
            const verdict = await vercelBudget.check(vercelGatewayBudgetScope(prompt.organizationId ?? null));
            if (!verdict.allowed) throw new Error('Vercel AI Gateway monthly budget exceeded.');
          }
          const adapted: AdapterPrompt = {
            prompt: prompt.prompt,
            ...(prompt.history === undefined ? {} : { history: prompt.history.map((message) => ({ role: message.role, text: message.text })) }),
            ...(prompt.systemInstruction === undefined ? {} : { systemInstruction: prompt.systemInstruction }),
            ...(prompt.temperature === undefined ? {} : { temperature: prompt.temperature }),
            ...(prompt.topP === undefined ? {} : { topP: prompt.topP }),
            ...(prompt.topK === undefined ? {} : { topK: prompt.topK }),
            ...(prompt.maxOutputTokens === undefined ? {} : { maxOutputTokens: prompt.maxOutputTokens }),
            ...(prompt.presencePenalty === undefined ? {} : { presencePenalty: prompt.presencePenalty }),
            ...(prompt.frequencyPenalty === undefined ? {} : { frequencyPenalty: prompt.frequencyPenalty }),
            ...(prompt.seed === undefined ? {} : { seed: prompt.seed }),
            ...(prompt.responseMimeType === undefined ? {} : { responseMimeType: prompt.responseMimeType }),
            ...(prompt.responseSchema === undefined ? {} : { responseSchema: { ...prompt.responseSchema } }),
            ...(prompt.stopSequences === undefined ? {} : { stopSequences: [...prompt.stopSequences] }),
            ...(prompt.thinkingConfig === undefined
              ? {}
              : {
                  thinkingConfig: {
                    ...(prompt.thinkingConfig.thinkingBudget === undefined
                      ? {}
                      : { thinkingBudget: prompt.thinkingConfig.thinkingBudget }),
                    ...(prompt.thinkingConfig.includeThoughts === undefined
                      ? {}
                      : { includeThoughts: prompt.thinkingConfig.includeThoughts }),
                  },
                }),
            ...(prompt.safetySettings === undefined
              ? {}
              : { safetySettings: prompt.safetySettings.map((setting) => ({ category: setting.category, threshold: setting.threshold })) }),
            ...(prompt.images === undefined ? {} : { images: prompt.images.map((image) => ({ base64: image.base64, mimeType: image.mimeType })) }),
            ...(prompt.audio === undefined ? {} : { audio: prompt.audio.map((item) => ({ base64: item.base64, mimeType: item.mimeType })) }),
            ...(prompt.enableTools === undefined ? {} : { enableTools: prompt.enableTools }),
            ...(prompt.responseModalities === undefined ? {} : { responseModalities: [...prompt.responseModalities] }),
            ...(prompt.speechVoiceName === undefined ? {} : { speechVoiceName: prompt.speechVoiceName }),
          };
          const result = await inner.execute(apiKey, modelName, adapted);
          if (providerId === 'vercel-gateway') {
            await vercelBudget.record(vercelGatewayBudgetScope(prompt.organizationId ?? null), result.tokensUsage?.total ?? 0);
          }
          return {
            text: result.text,
            tokensUsage: result.tokensUsage === undefined ? undefined : { ...result.tokensUsage },
            toolCallsExecuted: [...result.toolCallsExecuted],
            toolResults: result.toolResults === undefined ? undefined : { ...result.toolResults },
            inlineData: result.inlineData === undefined ? undefined : result.inlineData.map((item) => ({ ...item })),
          };
        },
      };
    },
  };
  gatewayByDeps.set(deps, gateway);
  return deps;
}

async function sessionFor(organizationId: string, requestId: string): Promise<{ readonly actor: ActorContext } | PublicErrorEnvelope> {
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return createNonDisclosingDenial(requestId);
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null) return createNonDisclosingDenial(requestId);
  return { actor };
}

async function auditDraftStream(db: AiDb, entry: {
  readonly correlationId: string;
  readonly providerId: string;
  readonly modelName: string;
  readonly credentialId: string | null;
  readonly organizationId: string;
  readonly status: 'success' | 'failed' | 'blocked';
  readonly retryCount: number;
  readonly latencyMs: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly errorClass?: string | undefined;
  readonly errorMessage?: string | undefined;
}): Promise<void> {
  try {
    await db.execute(
      sql`insert into ai_request_logs (correlation_id, channel, provider_id, model_name, credential_id, organization_id, status, retry_count, latency_ms, prompt_tokens, completion_tokens, total_tokens, tools_executed, error_class, error_message) values (${entry.correlationId}, 'web', ${entry.providerId}, ${entry.modelName}, ${entry.credentialId}, ${entry.organizationId}::uuid, ${entry.status}, ${entry.retryCount}, ${entry.latencyMs}, ${entry.promptTokens}, ${entry.completionTokens}, ${entry.totalTokens}, null, ${entry.errorClass ?? null}, ${entry.errorMessage ?? null})`,
    );
  } catch {
    /* Audit must never fail an answer. */
  }
}

function toRowArray(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) {
    const rows = (value as { readonly rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

type ServerRuntimeContext = Awaited<ReturnType<typeof getServerRuntimeContext>>;

/**
 * Builds Workers AI embedding credentials from the assembled runtime config.
 *
 * @param context - Server runtime context carrying the Cloudflare account scope.
 * @returns Account credentials honoring the configured embedding model override.
 */
function workersAiConfigFor(context: ServerRuntimeContext): WorkersAiCredentials {
  const embeddingModel = context.config.cloudflare.aiEmbeddingModel;
  return {
    accountId: context.config.cloudflare.accountId,
    apiToken: context.config.cloudflare.apiToken,
    ...(embeddingModel === null ? {} : { model: embeddingModel }),
  };
}

/**
 * Builds the shared embedding control surface from the assembled runtime config.
 *
 * @param db - Runtime database port for limit reads and audit writes.
 * @param redis - Upstash connection details plus the environment namespace.
 * @returns Budget guard plus namespaced rate-limit/quota/breaker store (`{namespace}:ai:*`).
 */
function embeddingControlsFor(
  db: AiDb,
  redis: { readonly url: string; readonly token: string; readonly namespace: string },
): AiOperationControls {
  return {
    db,
    budget: createAiBudgetGuard({ url: redis.url, token: redis.token, namespace: redis.namespace }),
    store: createAiModelRateLimitStore({ url: redis.url, token: redis.token, namespace: redis.namespace }),
  };
}

/** SSE headers shared by the live draft stream and the cache-hit shortcut. */
const DRAFT_STREAM_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

async function handleDraftArticleStream(
  deps: AiServiceDeps,
  organizationId: string,
  payload: Record<string, unknown>,
  requestId: string,
  requestSignal: AbortSignal,
  gateway: CloudflareGatewayConfig | null,
): Promise<Response> {
  const built = buildDraftArticleInput(str(payload.topic, 300), str(payload.points, 2000));
  if (!built.ok) return response(createPublicError('INVALID_INPUT', built.error, requestId));
  const secret = scanPrompt(built.prompt);
  if (!secret.ok) return response(createPublicError('INVALID_INPUT', secret.reason, requestId));
  // Parity note: no scanPromptForInjection/wrap here by design — the non-stream
  // draft-article path runs as role 'editor' (staff), which skips both in
  // executeAiQuery. The prompt is server-composed from truncated fields and
  // secret-scanned above; the route carries no AiCallerRole to do better.
  const preflightStartedAt = Date.now();
  // Budget + org-quota parity with executeAiQuery via the shared pre-flight
  // (same order, same fail-open and pre-charge-on-allow semantics). The quota
  // leg was previously missing on this path.
  const quotaVerdict = await checkOperationBudgetQuota(
    {
      db: deps.db,
      budget: deps.budget,
      ...(deps.rateLimit?.store === undefined ? {} : { store: deps.rateLimit.store }),
    },
    { organizationId, estimatedTokens: estimateAiInputTokens(built.prompt, 0) },
  );
  if (!quotaVerdict.allowed) {
    const guardrail = quotaVerdict.gate === 'budget' ? 'budget-guardrail' : 'org-quota-guardrail';
    await auditDraftStream(deps.db, {
      correlationId: requestId,
      providerId: guardrail,
      modelName: guardrail,
      credentialId: null,
      organizationId,
      status: 'blocked',
      retryCount: 0,
      latencyMs: Date.now() - preflightStartedAt,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      errorClass: quotaVerdict.errorClass,
      errorMessage: quotaVerdict.message,
    });
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan AI sedang sibuk. Silakan coba lagi.', requestId));
  }
  const policy = await getActiveRoutingPolicy(deps.db);
  if (policy === null || policy.primaryProviderId === null) {
    await auditDraftStream(deps.db, {
      correlationId: requestId,
      providerId: 'exhausted',
      modelName: 'none',
      credentialId: null,
      organizationId,
      status: 'blocked',
      retryCount: 0,
      latencyMs: Date.now() - preflightStartedAt,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      errorClass: 'ROUTING_UNCONFIGURED',
      errorMessage: 'Routing AI belum dikonfigurasi.',
    });
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Routing AI belum dikonfigurasi. Silakan coba lagi.', requestId));
  }
  const primaryProviderId = policy.primaryProviderId;
  const timeoutMs = Math.min(Math.max(policy.requestTimeoutMs || 60000, 1000), 300000);
  const breakerStore = deps.rateLimit?.store;
  const chainStartIndex = policy.chainStrategy === 'round_robin' ? await nextChainStartIndex(breakerStore) : 0;
  const configuredStreamable = resolveOrderedAiModelChain(policy, chainStartIndex).filter((entry) => entry.providerId === primaryProviderId);
  const streamableChain = await resolveCascadeChain(deps.db, configuredStreamable, undefined);
  const runnableChain: Array<{ readonly providerId: string; readonly modelName: string }> = [];
  for (const entry of streamableChain) {
    if (!(await isModelBreakerTripped(breakerStore, entry.providerId, entry.modelName))) runnableChain.push(entry);
  }
  const effectiveChain = runnableChain.length > 0 ? runnableChain : streamableChain;
  async function resolveStreamCredential(entry: { readonly providerId: string; readonly modelName: string }): Promise<{ readonly credentialId: string; readonly plainKey: string } | null> {
    const credentials = await getAvailableCredentials(deps.db, entry.providerId, { organizationId });
    const credential = credentials[0];
    if (credential === undefined) return null;
    const plainKey = await decryptAiKey(deps.db, credential.keyEncrypted);
    if (plainKey === '') return null;
    return { credentialId: credential.id, plainKey };
  }
  // Each entry credential is resolved once inside the attempt loop below;
  // entries without credentials are skipped, with no second decrypt pass.
  const startedAt = Date.now();
  // Semantic-cache shortcut: serve an identical previous draft without a provider call.
  if (deps.cache !== undefined) {
    const cacheKey = normalizeCachePrompt(built.prompt);
    const cachedModels = [policy.defaultModel, ...effectiveChain.map((entry) => entry.modelName)];
    const seen = new Set<string>();
    for (const modelName of cachedModels) {
      if (seen.has(modelName)) continue;
      seen.add(modelName);
      const hit = await deps.cache.lookup(cacheKey, modelName).catch(() => null);
      if (hit !== null) {
        const text = redactSecrets(hit.responseText);
        // Parity with executeAiQuery cache hits: served drafts stay observable.
        await auditDraftStream(deps.db, {
          correlationId: requestId,
          providerId: 'semantic-cache',
          modelName: hit.modelName,
          credentialId: null,
          organizationId,
          status: 'success',
          retryCount: 0,
          latencyMs: Date.now() - preflightStartedAt,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(`event: done\ndata: ${JSON.stringify({ text })}\n\n`));
              controller.close();
            },
          }),
          { headers: DRAFT_STREAM_HEADERS },
        );
      }
    }
  }
  // Per-model rate-limit guard; fail-open when limits or counters are unavailable.
  if (breakerStore !== undefined) {
    const targetModel = effectiveChain[0]?.modelName ?? policy.defaultModel;
    try {
      const limits = await getAiModelLimits(deps.db, targetModel);
      const verdict = await checkAiModelRateLimit(breakerStore, limits, targetModel, estimateAiInputTokens(built.prompt, 0));
      if (!verdict.allowed) {
        await auditDraftStream(deps.db, {
          correlationId: requestId,
          providerId: 'rate-limit-guardrail',
          modelName: targetModel,
          credentialId: null,
          organizationId,
          status: 'blocked',
          retryCount: 0,
          latencyMs: Date.now() - preflightStartedAt,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          errorClass: 'rate_limited',
          errorMessage: `Model ${targetModel} exceeded rate limit`,
        });
        return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan AI sedang sibuk. Silakan coba lagi.', requestId));
      }
    } catch {
      /* Fail open so a counter outage never blocks answers. */
    }
  }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string | null, data: unknown): void => {
        try {
          controller.enqueue(encoder.encode(`${event === null ? '' : `event: ${event}\n`}data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* Client went away; the abort signal stops the provider loop. */
        }
      };
      // Periodic SSE comment keeps intermediaries from closing an idle stream.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          /* Closed by the client; cleared in the run finally block. */
        }
      }, 15_000);
      const run = async (): Promise<void> => {
        // Same per-instance concurrency bound as single-shot queries.
        await acquireAiGlobalSlot(policy.globalConcurrencyLimit);
        try {
          let sentAny = false;
          let lastFailure: { readonly errorClass: string; readonly message: string } | null = null;
          const combinedSignal = AbortSignal.any([requestSignal, AbortSignal.timeout(timeoutMs)]);
          for (const [index, entry] of effectiveChain.entries()) {
            if (index > 0) {
              if (combinedSignal.aborted) {
                send('error', { error: 'Streaming dibatalkan.' });
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, computeRetryDelayMs(1)));
            }
            const resolved = await resolveStreamCredential(entry);
            if (resolved === null) continue;
            // Unannotated literal: every field is defined, keeping it
            // assignable to both the service and adapter prompt types.
            const streamPrompt = {
              prompt: built.prompt,
              systemInstruction: built.systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseSchema: ARTICLE_DRAFT_SCHEMA,
              costMode: policy.costMode,
            };
            const succeed = async (text: string, tokens: AiAdapterResult['tokensUsage']): Promise<void> => {
              const latencyMs = Date.now() - startedAt;
              await recordKeySuccess(deps.db, resolved.credentialId, latencyMs);
              await recordModelSuccess(breakerStore, entry.providerId, entry.modelName);
              await deps.budget.recordAiTokenUsage(tokens?.total ?? 0);
              await auditDraftStream(deps.db, {
                correlationId: requestId,
                providerId: entry.providerId,
                modelName: entry.modelName,
                credentialId: resolved.credentialId,
                organizationId,
                status: 'success',
                retryCount: index,
                latencyMs,
                promptTokens: tokens?.prompt ?? 0,
                completionTokens: tokens?.completion ?? 0,
                totalTokens: tokens?.total ?? 0,
              });
              send('done', { text: redactSecrets(text) });
            };
            try {
              if (combinedSignal.aborted) throw new Error('AI stream aborted.');
              if (entry.providerId !== 'gemini') {
                const adapter = deps.resolveAdapter(entry.providerId);
                const streamable = asStreamCapableAdapter(adapter);
                if (streamable !== null && typeof streamable.executeStream === 'function') {
                  const result = await streamable.executeStream(resolved.plainKey, entry.modelName, streamPrompt, {
                    signal: combinedSignal,
                    onChunk: (delta) => {
                      sentAny = true;
                      send(null, { delta: redactSecrets(delta) });
                    },
                  });
                  if (combinedSignal.aborted) throw new Error('AI stream aborted.');
                  sentAny = true;
                  await succeed(result.text, result.tokensUsage);
                  return;
                }
                const result = await adapter.execute(resolved.plainKey, entry.modelName, streamPrompt, { signal: combinedSignal });
                if (combinedSignal.aborted) throw new Error('AI stream aborted.');
                sentAny = true;
                send(null, { delta: redactSecrets(result.text) });
                await succeed(result.text, result.tokensUsage);
                return;
              }
              const result = await executeGeminiStream(
                resolved.plainKey,
                entry.modelName,
                streamPrompt,
                {
                  signal: combinedSignal,
                  onChunk: (delta) => {
                    sentAny = true;
                    send(null, { delta: redactSecrets(delta) });
                  },
                  ...(gateway === null ? {} : { gateway }),
                },
              );
              await succeed(result.text, result.tokensUsage);
              return;
            } catch (error) {
              const aborted = error instanceof Error && /abort/i.test(error.message);
              const latencyMs = Date.now() - startedAt;
              if (aborted) {
                await auditDraftStream(deps.db, {
                  correlationId: requestId,
                  providerId: entry.providerId,
                  modelName: entry.modelName,
                  credentialId: resolved.credentialId,
                  organizationId,
                  status: 'failed',
                  retryCount: index,
                  latencyMs,
                  promptTokens: 0,
                  completionTokens: 0,
                  totalTokens: 0,
                  errorClass: 'aborted',
                  errorMessage: 'Streaming dibatalkan.',
                });
                send('error', { error: 'Streaming dibatalkan.' });
                return;
              }
              const classified = classifyAiError(error);
              lastFailure = { errorClass: classified.errorClass, message: classified.message };
              await recordKeyFailure(deps.db, resolved.credentialId, classified.errorClass, classified.message, policy.cooldownDurationSec);
              if (!sentAny) {
                if (AI_BREAKER_ERROR_CLASSES.includes(classified.errorClass)) {
                  await recordModelInfraFailure(breakerStore, entry.providerId, entry.modelName);
                }
                if (classified.isRetryable) continue;
              }
              await auditDraftStream(deps.db, {
                correlationId: requestId,
                providerId: entry.providerId,
                modelName: entry.modelName,
                credentialId: resolved.credentialId,
                organizationId,
                status: 'failed',
                retryCount: index,
                latencyMs,
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                errorClass: classified.errorClass,
                errorMessage: classified.message.slice(0, 500),
              });
              send('error', { error: 'Layanan AI sedang sibuk. Silakan coba lagi.' });
              return;
            }
          }
          const exhausted = effectiveChain[effectiveChain.length - 1];
          await auditDraftStream(deps.db, {
            correlationId: requestId,
            providerId: exhausted?.providerId ?? primaryProviderId,
            modelName: exhausted?.modelName ?? policy.defaultModel,
            credentialId: null,
            organizationId,
            status: 'failed',
            retryCount: effectiveChain.length,
            latencyMs: Date.now() - startedAt,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            errorClass: lastFailure?.errorClass ?? 'exhausted',
            errorMessage: (lastFailure?.message ?? 'All draft stream entries failed.').slice(0, 500),
          });
          send('error', { error: 'Layanan AI sedang sibuk. Silakan coba lagi.' });
        } finally {
          clearInterval(heartbeat);
          releaseAiGlobalSlot();
          try {
            controller.close();
          } catch {
            /* Already cancelled by the client. */
          }
        }
      };
      void run();
    },
  });
  return new Response(stream, {
    headers: DRAFT_STREAM_HEADERS,
  });
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return response(createNonDisclosingDenial(requestId));
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Invalid AI command.', requestId));
  const session = await sessionFor(parsed.data.organizationId, requestId);
  if ('error' in session) return response(session);
  const { organizationId, action, payload } = parsed.data;
  const deps = await serviceDeps(organizationId);
  configureAiUsage(deps);
  configureAiSeo(deps);
  configureAiCover(deps);
  configureAiTts(deps);
  configureAiTranscribe(deps);
  configurePublisherVerify(deps);
  configureAiAssistant(deps);
  try {
    switch (action) {
      case 'draft-article': {
        const result = await generateArticleDraft({ topic: str(payload.topic, 300), points: str(payload.points, 2000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'draft-article-stream': {
        return handleDraftArticleStream(deps, organizationId, payload, requestId, request.signal, gatewayByDeps.get(deps) ?? null);
      }
      case 'suggest-tags': {
        const result = await suggestTags({ title: str(payload.title, 200), body: str(payload.body, 8000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'summarize-report': {
        const result = await summarizeReport({ category: str(payload.category, 80), details: str(payload.details, 4000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'moderation-reply': {
        const result = await draftModerationReply({ context: str(payload.context, 4000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'vision-draft': {
        const result = await ocVisionDraft({ base64: str(payload.base64, 7_000_000), mimeType: str(payload.mimeType, 60), hint: str(payload.hint, 500), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'cover-caption': {
        const result = await ocCoverCaption({ base64: str(payload.base64, 7_000_000), mimeType: str(payload.mimeType, 60), title: str(payload.title, 200), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'insight-narrative': {
        const result = await narrateInsights({ summary: str(payload.summary, 2000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'semantic-search': {
        const query = str(payload.query, 200).trim();
        if (query.length < 3) return response(createPublicError('INVALID_INPUT', 'Kueri minimal 3 karakter.', requestId));
        const context = await getServerRuntimeContext();
        const runtime = getSharedRuntimeDatabase(context.bootstrap);
        const queryVector = await embedQueryVector(runtime.db, organizationId, query, {
          provider: 'auto',
          workersAi: workersAiConfigFor(context),
          controls: embeddingControlsFor(runtime.db, context.config.redis),
          operation: AI_EMBED_OPERATION_QUERY,
        });
        if (queryVector !== null) {
          try {
            const value = await runtime.db.execute(sql`
              SELECT id, article_id, chunk, embedding
              FROM document_embeddings
              WHERE organization_id = ${organizationId}::uuid
              ORDER BY created_at DESC
              LIMIT ${SEMANTIC_CANDIDATE_LIMIT}
            `);
            const candidates: SemanticCandidate[] = [];
            for (const row of toRowArray(value)) {
              const base = toSemanticCandidate(row);
              if (base === null) continue;
              const chunk = typeof (row as Record<string, unknown>).chunk === 'string'
                ? ((row as Record<string, unknown>).chunk as string)
                : '';
              candidates.push({ ...base, excerpt: chunk.slice(0, 200) });
            }
            const hits = rankSemanticCandidates(queryVector, candidates);
            if (hits.length > 0) {
              return NextResponse.json({
                ok: true,
                results: hits.map((hit) => ({ id: hit.id, article_id: hit.articleId, excerpt: hit.excerpt, score: hit.score })),
              });
            }
          } catch {
            /* Vector path failed; fall through to the ILIKE fallback below. */
          }
        }
        try {
          const rows = await runtime.db.execute<{ readonly id: string; readonly article_id: string | null; readonly excerpt: string }>(sql`
            SELECT id, article_id, LEFT(chunk, 200) AS excerpt
            FROM document_embeddings
            WHERE organization_id = ${organizationId}::uuid AND chunk ILIKE ${`%${query.slice(0, 100)}%`}
            ORDER BY created_at DESC
            LIMIT 20
          `);
          const results = (Array.isArray(rows) ? rows : (rows as { readonly rows?: unknown }).rows) as readonly unknown[] | undefined;
          return NextResponse.json({ ok: true, results: Array.isArray(results) ? results.slice(0, 20) : [] });
        } catch {
          return NextResponse.json({ ok: true, results: [], note: 'Indeks semantik belum tersedia; gunakan pencarian judul/slug.' });
        }
      }
      case 'embeddings-reindex': {
        const articleId = z.uuid().safeParse(payload.articleId);
        if (!articleId.success) return response(createPublicError('INVALID_INPUT', 'articleId tidak valid.', requestId));
        const context = await getServerRuntimeContext();
        const runtime = getSharedRuntimeDatabase(context.bootstrap);
        const result = await reindexArticleEmbeddings(
          runtime.db,
          { organizationId, articleId: articleId.data },
          {
            provider: 'auto',
            workersAi: workersAiConfigFor(context),
            controls: embeddingControlsFor(runtime.db, context.config.redis),
            operation: AI_EMBED_OPERATION_REINDEX,
          },
        );
        return result.ok
          ? NextResponse.json({ ok: true, chunks: result.chunks, embedded: result.embedded, embeddingProvider: result.embeddingProvider })
          : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'seo-titles': {
        const result = await suggestTitles({ title: str(payload.title, 200), body: str(payload.body, 8000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'seo-meta': {
        const result = await suggestMetaDescription({ title: str(payload.title, 200), body: str(payload.body, 8000), current: str(payload.current, 400), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'seo-excerpt': {
        const result = await suggestExcerpt({ title: str(payload.title, 200), body: str(payload.body, 8000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'seo-bundle': {
        const result = await suggestSeoBundle({ title: str(payload.title, 200), body: str(payload.body, 8000), excerpt: str(payload.excerpt, 2000), current: str(payload.current, 400), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'polish-body': {
        const result = await polishBody({ title: str(payload.title, 200), body: str(payload.body, 8000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'classify-article': {
        const categories = Array.isArray(payload.categories)
          ? payload.categories.filter((item): item is string => typeof item === 'string').slice(0, 80)
          : [];
        const result = await classifyArticle({ title: str(payload.title, 200), body: str(payload.body, 8000), categories, organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'cover-image': {
        const aspect = payload.aspectRatio === '1:1' || payload.aspectRatio === '9:16' ? payload.aspectRatio : '16:9';
        const result = await generateCoverImage({ title: str(payload.title, 200), style: str(payload.style, 120), aspectRatio: aspect, organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'tts-speak': {
        const result = await synthesizeSpeech({ text: str(payload.text, 4000), voice: str(payload.voice, 40), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'transcribe-audio': {
        const result = await transcribeAudio({ base64: str(payload.base64, 10_000_000), mimeType: str(payload.mimeType, 60), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'transcribe-to-article': {
        const categories = Array.isArray(payload.categories)
          ? payload.categories.filter((item): item is string => typeof item === 'string').slice(0, 80)
          : [];
        const result = await transcribeToArticle({ base64: str(payload.base64, 10_000_000), mimeType: str(payload.mimeType, 60), categories, organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'publisher-verify': {
        const result = await verifyPublisher({ name: str(payload.name, 300), evidence: str(payload.evidence, 4000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'assistant-chat': {
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        const result = await assistantChat({ messages, organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      default: {
        return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Aksi AI ini belum tersedia.', requestId));
      }
    }
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan AI sedang sibuk. Silakan coba lagi.', requestId));
  }
}

/**
 * Menangani perintah bantuan AI dasbor lewat control plane.
 *
 * @returns Respons JSON hasil AI atau envelope error publik; audit dicatat control plane.
 */
export const POST = withApiAccess('POST /api/dashboard/ai', handlePOST);
