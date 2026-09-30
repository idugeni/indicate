import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { DASHBOARD_ACCESS_KEY_COOKIE } from '@/modules/auth/dashboard-access-keys/cookie';
import { resolveAccessKeyActor } from '@/modules/auth/dashboard-access-keys/resolve-access-key-actor';
import type { ActorContext } from '@/core/operation-context';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createHardenedSupabaseCookieStore, createSupabaseSsrAuthAdapter } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { configureAiUsage, buildDraftArticleInput, draftModerationReply, generateArticleDraft, narrateInsights, ocVisionDraft, scanPrompt, suggestTags, summarizeReport } from '@/modules/ai/ai-usage';
import { configureAiSeo, suggestSeo } from '@/modules/ai/ai-seo';
import { configureAiCover, generateCoverImage } from '@/modules/ai/ai-cover';
import { configureAiTts, synthesizeSpeech } from '@/modules/ai/ai-tts';
import { configureAiTranscribe, transcribeAudio } from '@/modules/ai/ai-transcribe';
import { configurePublisherVerify, verifyPublisher } from '@/modules/ai/ai-verify';
import { configureAiAssistant, assistantChat } from '@/modules/ai/ai-assistant';
import { createAiSemanticCache } from '@/modules/ai/ai-semantic-cache';
import { SEMANTIC_CANDIDATE_LIMIT, reindexArticleEmbeddings, toSemanticCandidate } from '@/modules/ai/ai-embeddings';
import type { AiDb } from '@/modules/ai/ai-types';
import type { AiServiceDeps } from '@/modules/ai/ai-service';
import type { AiChatPrompt as ServicePrompt } from '@/modules/ai/ai-types';
import { createAiBudgetGuard, redactSecrets } from '@/modules/ai/ai-security';
import { createAiModelRateLimitStore } from '@/modules/ai/ai-rate-limit';
import { getAiAdapter } from '@/integrations/ai/adapter-registry';
import { executeGeminiStream } from '@/integrations/ai/gemini-adapter';
import { embedTexts, rankSemanticCandidates, type SemanticCandidate } from '@/integrations/ai/embeddings';
import { decryptAiKey } from '@/modules/ai/ai-crypto';
import { classifyAiError, getActiveRoutingPolicy, getAvailableCredentials, recordKeyFailure, recordKeySuccess, resolveApiKey } from '@/modules/ai/ai-router';
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
    'insight-narrative',
    'semantic-search',
    'embeddings-reindex',
    'seo-suggest',
    'cover-image',
    'tts-speak',
    'transcribe-audio',
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

async function serviceDeps(organizationId?: string | undefined): Promise<AiServiceDeps> {
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const redis = context.config.redis;
  return {
    db: runtime.db,
    budget: createAiBudgetGuard({ url: redis.url, token: redis.token, namespace: redis.namespace }),
    rateLimit: { store: createAiModelRateLimitStore({ url: redis.url, token: redis.token }) },
    cache: createAiSemanticCache(runtime.db, { organizationId: organizationId ?? null }),
    resolveAdapter: (providerId: string) => {
      const inner = getAiAdapter(providerId);
      return {
        execute: async (apiKey: string, modelName: string, prompt: ServicePrompt) => {
          const adapted: AdapterPrompt = {
            prompt: prompt.prompt,
            ...(prompt.systemInstruction === undefined ? {} : { systemInstruction: prompt.systemInstruction }),
            ...(prompt.temperature === undefined ? {} : { temperature: prompt.temperature }),
            ...(prompt.maxOutputTokens === undefined ? {} : { maxOutputTokens: prompt.maxOutputTokens }),
            ...(prompt.responseMimeType === undefined ? {} : { responseMimeType: prompt.responseMimeType }),
            ...(prompt.images === undefined ? {} : { images: prompt.images.map((image) => ({ base64: image.base64, mimeType: image.mimeType })) }),
            ...(prompt.audio === undefined ? {} : { audio: prompt.audio.map((item) => ({ base64: item.base64, mimeType: item.mimeType })) }),
            ...(prompt.enableTools === undefined ? {} : { enableTools: prompt.enableTools }),
            ...(prompt.responseModalities === undefined ? {} : { responseModalities: [...prompt.responseModalities] }),
            ...(prompt.speechVoiceName === undefined ? {} : { speechVoiceName: prompt.speechVoiceName }),
          };
          const result = await inner.execute(apiKey, modelName, adapted);
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
}

async function sessionFor(organizationId: string, requestId: string): Promise<{ readonly actor: ActorContext } | PublicErrorEnvelope> {
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) {
    const bearer = cookieStore.get(DASHBOARD_ACCESS_KEY_COOKIE)?.value ?? null;
    if (bearer !== null) {
      const keyContext = await getServerRuntimeContext();
      const keyRuntime = getSharedRuntimeDatabase(keyContext.bootstrap);
      const resolved = await resolveAccessKeyActor(keyRuntime.db, bearer, requestId).catch(() => null);
      if (resolved !== null && resolved.actor.organizationId === organizationId) {
        return {
          actor: {
            actorType: 'user', actorId: resolved.actor.actorId, verifiedAuthUserId: resolved.identity.authUserId, organizationId,
            permissionSet: new Set(), platformPermissionSet: new Set(), entryPoint: 'dashboard', requestId,
          },
        };
      }
    }
    return createNonDisclosingDenial(requestId);
  }
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const authorization = new DrizzleAuthorizationRepository(runtime.db);
  const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
  if (!local.ok || local.value.status !== 'active') return createNonDisclosingDenial(requestId);
  const membership = await authorization.findActiveMembership(organizationId, local.value.id).catch(() => null);
  if (membership === null || !membership.roleActive) return createNonDisclosingDenial(requestId);
  return {
    actor: {
      actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId,
      permissionSet: new Set(), platformPermissionSet: new Set(), entryPoint: 'dashboard', requestId,
    },
  };
}

async function auditDraftStream(db: AiDb, entry: {
  readonly correlationId: string;
  readonly providerId: string;
  readonly modelName: string;
  readonly credentialId: string | null;
  readonly organizationId: string;
  readonly status: 'success' | 'failed';
  readonly latencyMs: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly errorClass?: string | undefined;
  readonly errorMessage?: string | undefined;
}): Promise<void> {
  try {
    await db.execute(
      sql`insert into ai_request_logs (correlation_id, channel, provider_id, model_name, credential_id, organization_id, status, retry_count, latency_ms, prompt_tokens, completion_tokens, total_tokens, tools_executed, error_class, error_message) values (${entry.correlationId}, 'web', ${entry.providerId}, ${entry.modelName}, ${entry.credentialId}, ${entry.organizationId}::uuid, ${entry.status}, 0, ${entry.latencyMs}, ${entry.promptTokens}, ${entry.completionTokens}, ${entry.totalTokens}, null, ${entry.errorClass ?? null}, ${entry.errorMessage ?? null})`,
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

async function embedQueryVector(db: AiDb, organizationId: string, query: string): Promise<readonly number[] | null> {
  try {
    const plainKey = await resolveApiKey(db, 'gemini', { organizationId });
    if (plainKey === null) return null;
    const vectors = await embedTexts(plainKey, [query]);
    return vectors[0] ?? null;
  } catch {
    return null;
  }
}

async function handleDraftArticleStream(
  deps: AiServiceDeps,
  organizationId: string,
  payload: Record<string, unknown>,
  requestId: string,
  requestSignal: AbortSignal,
): Promise<Response> {
  const built = buildDraftArticleInput(str(payload.topic, 300), str(payload.points, 2000));
  if (!built.ok) return response(createPublicError('INVALID_INPUT', built.error, requestId));
  const secret = scanPrompt(built.prompt);
  if (!secret.ok) return response(createPublicError('INVALID_INPUT', secret.reason, requestId));
  const budget = await deps.budget.checkAiBudgetSafeguard();
  if (!budget.allowed) {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan AI sedang sibuk. Silakan coba lagi.', requestId));
  }
  const policy = await getActiveRoutingPolicy(deps.db);
  const providerId = policy.primaryProviderId ?? 'gemini';
  const modelName = policy.defaultModel;
  const credentials = await getAvailableCredentials(deps.db, providerId, { organizationId });
  const credential = credentials[0];
  if (credential === undefined) {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan AI sedang sibuk. Silakan coba lagi.', requestId));
  }
  const plainKey = await decryptAiKey(deps.db, credential.keyEncrypted);
  if (plainKey === '') {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Layanan AI sedang sibuk. Silakan coba lagi.', requestId));
  }
  const startedAt = Date.now();
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
      const run = async (): Promise<void> => {
        try {
          const result = await executeGeminiStream(
            plainKey,
            modelName,
            {
              prompt: built.prompt,
              systemInstruction: built.systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
            },
            {
              signal: requestSignal,
              onChunk: (delta) => send(null, { delta: redactSecrets(delta) }),
            },
          );
          const latencyMs = Date.now() - startedAt;
          await recordKeySuccess(deps.db, credential.id, latencyMs);
          await deps.budget.recordAiTokenUsage(result.tokensUsage?.total ?? 0);
          await auditDraftStream(deps.db, {
            correlationId: requestId,
            providerId,
            modelName,
            credentialId: credential.id,
            organizationId,
            status: 'success',
            latencyMs,
            promptTokens: result.tokensUsage?.prompt ?? 0,
            completionTokens: result.tokensUsage?.completion ?? 0,
            totalTokens: result.tokensUsage?.total ?? 0,
          });
          send('done', { text: redactSecrets(result.text) });
        } catch (error) {
          const aborted = error instanceof Error && error.message === 'Gemini stream aborted.';
          const latencyMs = Date.now() - startedAt;
          if (!aborted) {
            const classified = classifyAiError(error);
            await recordKeyFailure(deps.db, credential.id, classified.errorClass, classified.message, policy.cooldownDurationSec);
          }
          await auditDraftStream(deps.db, {
            correlationId: requestId,
            providerId,
            modelName,
            credentialId: credential.id,
            organizationId,
            status: 'failed',
            latencyMs,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            errorClass: aborted ? 'aborted' : 'stream_failed',
            errorMessage: 'draft-article-stream failed',
          });
          send('error', { error: aborted ? 'Streaming dibatalkan.' : 'Layanan AI sedang sibuk. Silakan coba lagi.' });
        } finally {
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
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
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
        const deps = await serviceDeps(organizationId);
        return handleDraftArticleStream(deps, organizationId, payload, requestId, request.signal);
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
      case 'insight-narrative': {
        const result = await narrateInsights({ summary: str(payload.summary, 2000), organizationId });
        return result.ok ? NextResponse.json(result) : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'semantic-search': {
        const query = str(payload.query, 200).trim();
        if (query.length < 3) return response(createPublicError('INVALID_INPUT', 'Kueri minimal 3 karakter.', requestId));
        const context = await getServerRuntimeContext();
        const runtime = getSharedRuntimeDatabase(context.bootstrap);
        const queryVector = await embedQueryVector(runtime.db, organizationId, query);
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
        const result = await reindexArticleEmbeddings(runtime.db, { organizationId, articleId: articleId.data });
        return result.ok
          ? NextResponse.json({ ok: true, chunks: result.chunks, embedded: result.embedded })
          : response(createPublicError('DEPENDENCY_UNAVAILABLE', result.error, requestId));
      }
      case 'seo-suggest': {
        const result = await suggestSeo({ title: str(payload.title, 200), body: str(payload.body, 8000), organizationId });
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
