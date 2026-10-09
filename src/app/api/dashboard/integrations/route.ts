import { encodeCursor, pageFromSearchParams } from '@/data/repos/shared/list-page';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { DashboardAccessKeyService } from '@/modules/auth/dashboard-access-keys/access-key-service';
import { DrizzleDashboardAccessKeyRepository } from '@/data/repos/dashboard-access-keys';
import { AiService } from '@/modules/integrations/ai-service';
import { ApiKeyService } from '@/modules/integrations/api-key-service';
import { CustomerService } from '@/modules/integrations/customer-service';
import { EmailTestService } from '@/modules/integrations/email-test-service';
import { RateLimitService } from '@/modules/integrations/rate-limit-service';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAiRepository } from '@/data/repos/ai';
import { DrizzleIntegrationsRepository } from '@/data/repos/integrations';
import { aiBreakerKey } from '@/modules/ai/ai-router';
import { aiScopedGet } from '@/modules/ai/ai-redis-namespace';
import { buildChainHealth, type AiChainHealthEntry } from '@/modules/ai/ai-chain-health';
import { createResendEmailApiAdapter } from '@/integrations/email/resend-email-api';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { UpstashRateLimitAdapter } from '@/integrations/redis/upstash-rate-limit';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const querySchema = z.object({ organizationId: z.uuid(), view: z.enum(['settings', 'customers', 'ai']), customerId: z.uuid().optional() });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() }).strict();
/**
 * Maps an integrations envelope to its HTTP status.
 *
 * @param error - Envelope produced by integration services or denial helpers.
 * @returns Status code honoring 429 for rate-limited webhook traffic.
 */
const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
interface Context { readonly actor: AuthorizedTenantActorContext; readonly localUserId: string; readonly repository: DrizzleIntegrationsRepository; readonly apiKeys: ApiKeyService; readonly accessKeys: DashboardAccessKeyService; readonly ai: AiService; readonly customers: CustomerService; readonly emailTest: EmailTestService; readonly emailStatus: { readonly configured: boolean; readonly defaultFrom: string | null; readonly webhook: boolean }; readonly rateLimits: RateLimitService; readonly redis: Redis; readonly namespace: string; readonly policy: { allowance: number; windowSeconds: number; failureMode: 'closed' } }
type ContextResult = Context | PublicErrorEnvelope; const isError = (value: ContextResult): value is PublicErrorEnvelope => 'error' in value;

async function contextFor(organizationId: string, requestId: string): Promise<ContextResult> {
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext(); const config = context.config; const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const identifiers = new UuidGenerator();
  const repository = new DrizzleIntegrationsRepository(runtime.db);
  const accessKeys = new DashboardAccessKeyService(new DrizzleDashboardAccessKeyRepository(runtime.db), identifiers);
  const emailPort = config.email === null ? null : createResendEmailApiAdapter(config.email.apiKey, config.email.defaultFrom);
  const shared = { repository, apiKeys: new ApiKeyService(repository, identifiers), accessKeys, ai: new AiService(new DrizzleAiRepository(runtime.db)), customers: new CustomerService(repository, identifiers), emailTest: new EmailTestService(emailPort), emailStatus: config.email === null ? Object.freeze({ configured: false as const, defaultFrom: null, webhook: false as const }) : Object.freeze({ configured: true as const, defaultFrom: config.email.defaultFrom, webhook: config.email.webhookSecret !== null }), rateLimits: new RateLimitService(new UpstashRateLimitAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })), redis: new Redis({ url: config.redis.url, token: config.redis.token }), namespace: config.redis.namespace, policy: { ...config.rateLimits.mutation, failureMode: 'closed' as const } };
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return createNonDisclosingDenial(requestId);
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null) return createNonDisclosingDenial(requestId);
  return { actor, localUserId: user.localUserId, ...shared };
}
function response(error: PublicErrorEnvelope) { const retry = error.error.fields?.retryAfterSeconds?.[0]; return NextResponse.json(error, { status: statusFor(error), ...(retry === undefined ? {} : { headers: { 'Retry-After': retry } }) }); }

/**
 * Read live breaker counters for the armed chain without touching providers.
 *
 * @param context - Request context carrying the runtime Redis connection.
 * @param overview - Panel overview holding the armed policy and credentials.
 * @returns Ordered chain health; empty when routing is unconfigured or Redis is down.
 */
async function readChainHealth(
  context: { readonly redis: Pick<Redis, 'get'>; readonly namespace: string | null },
  overview: { readonly policy: { readonly chainStrategy: 'fallback' | 'round_robin'; readonly costMode: 'throughput' | 'price'; readonly primaryProviderId: string | null; readonly fallbackProviderId: string | null; readonly defaultModel: string; readonly fallbackModel: string } | null; readonly credentials: readonly { readonly providerId: string; readonly status: string }[] },
): Promise<readonly AiChainHealthEntry[]> {
  const policy = overview.policy;
  if (policy === null) return [];
  try {
    const { redis, namespace } = context;
    const entries = [
      { providerId: policy.primaryProviderId, modelName: policy.defaultModel },
      ...(policy.fallbackProviderId === null ? [] : [{ providerId: policy.fallbackProviderId, modelName: policy.fallbackModel }]),
    ];
    const values = new Map<string, unknown>();
    await Promise.all(entries.map(async (entry) => {
      if (entry.providerId === null) return;
      try {
        const legacy = aiBreakerKey(entry.providerId, entry.modelName);
        values.set(legacy, await aiScopedGet((key) => redis.get(key), namespace, legacy));
      } catch {
        /* Fail open: one unreadable counter must not hide the chain. */
      }
    }));
    const active = new Set(overview.credentials.filter((row) => row.status === 'active').map((row) => row.providerId));
    return buildChainHealth(
      {
        id: 'default',
        rotationStrategy: 'health_aware',
        chainStrategy: policy.chainStrategy,
        costMode: policy.costMode,
        primaryProviderId: policy.primaryProviderId,
        fallbackProviderId: policy.fallbackProviderId,
        defaultModel: policy.defaultModel,
        fallbackModel: policy.fallbackModel,
        maxRetries: 5,
        perKeyRetryLimit: 2,
        cooldownDurationSec: 60,
        requestTimeoutMs: 60000,
        globalConcurrencyLimit: 100,
        updatedAt: new Date(0).toISOString(),
      },
      values,
      active,
    );
  } catch {
    return [];
  }
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request); const url = new URL(request.url); const parsed = querySchema.safeParse({ organizationId: url.searchParams.get('organizationId'), view: url.searchParams.get('view'), customerId: url.searchParams.get('customerId') ?? undefined }); if (!parsed.success) return response(createNonDisclosingDenial(requestId));
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return response(context);
  {
    if (parsed.data.view === 'customers') {
      if (parsed.data.customerId !== undefined) {
        const result = await context.customers.read(context.actor, parsed.data.customerId);
        return result.ok ? NextResponse.json(result.value) : response(result.error);
      }
      const page = pageFromSearchParams(url);
      const result = await context.customers.list(context.actor, page);
      if (!result.ok) return response(result.error);
      const effectiveLimit = Math.min(Math.max(Math.floor(page.limit ?? 100), 1), 500);
      const last = result.value[result.value.length - 1];
      const nextCursor = result.value.length === effectiveLimit && last !== undefined
        ? encodeCursor(last.customer.createdAt, last.customer.id)
        : null;
      return NextResponse.json(result.value, {
        headers: nextCursor === null ? {} : { 'X-Next-Cursor': nextCursor },
      });
    }
    if (parsed.data.view === 'ai') {
      const result = await context.ai.overview(context.actor);
      if (!result.ok) return response(result.error);
      return NextResponse.json({ ...result.value, chainHealth: await readChainHealth(context, result.value) });
    }
    const [keys, accessKeys, subscription] = await Promise.all([context.apiKeys.list(context.actor), context.accessKeys.list(context.actor), context.customers.readSubscription(context.actor)]); if (!keys.ok) return response(keys.error); if (!accessKeys.ok) return response(accessKeys.error); if (!subscription.ok) return response(subscription.error); return NextResponse.json({ apiKeys: keys.value, accessKeys: accessKeys.value, subscription: subscription.value, email: context.emailStatus });
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return response(createNonDisclosingDenial(requestId));
  const parsed = commandSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Invalid Integrations command.', requestId));
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return response(context);
  {
    const limited = await context.rateLimits.enforce(context.rateLimits.authenticatedKey('dashboard-mutation', context.actor), context.policy, requestId); if (!limited.ok) return response(limited.error);
    const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'api-key.issue': (payload) => context.apiKeys.issue(context.actor, payload), 'api-key.rotate': (payload) => context.apiKeys.rotate(context.actor, payload), 'api-key.revoke': (payload) => context.apiKeys.revoke(context.actor, payload),
      'access-key.issue': (payload) => context.accessKeys.issue(context.actor, context.localUserId, payload), 'access-key.revoke': (payload) => context.accessKeys.revoke(context.actor, payload),
      'email.test': (payload) => context.emailTest.send(context.actor, payload),
      'ai.credential.create': (payload) => context.ai.createCredential(context.actor, payload), 'ai.credential.test': (payload) => context.ai.testCredential(context.actor, payload), 'ai.credential.toggle': (payload) => context.ai.toggleCredential(context.actor, payload), 'ai.credential.delete': (payload) => context.ai.deleteCredential(context.actor, payload), 'ai.model.toggle': (payload) => context.ai.toggleModel(context.actor, payload),
      'ai.policy.update': (payload) => context.ai.updatePolicy(context.actor, payload),
      'ai.master.provision': (payload) => context.ai.provisionMaster(context.actor, payload),
      'ai.insight.report': (payload) => context.ai.reportInsight(context.actor, payload), 'ai.insight.resolve': (payload) => context.ai.resolveInsight(context.actor, payload),
      'customer.create': (payload) => context.customers.create(context.actor, payload), 'customer.update': (payload) => context.customers.update(context.actor, payload), 'subscription.update': (payload) => context.customers.updateSubscription(context.actor, payload), 'membership.assign-first': (payload) => context.customers.assignFirstAdmin(context.actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return response(createPublicError('INVALID_INPUT', 'Unknown Integrations command.', requestId)); const result = await action(parsed.data.payload); return result.ok ? NextResponse.json(result.value) : response(result.error);
  }
}

const GET = withApiAccess('GET /api/dashboard/integrations', handleGET);
/** Dispatch dashboard Integrations commands. */
const POST = withApiAccess('POST /api/dashboard/integrations', handlePOST);
