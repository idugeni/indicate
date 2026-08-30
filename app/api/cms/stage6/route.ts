import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/application/auth/resolve-authenticated-user';
import { ApiKeyService } from '@/application/stage6/api-key-service';
import { CustomerService } from '@/application/stage6/customer-service';
import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { TelegramMappingService } from '@/application/stage6/telegram-mapping-service';
import { getPublicConfig } from '@/config/public';
import { getRuntimeConfig } from '@/config/server';
import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { createSupabaseSsrAuthAdapter } from '@/infrastructure/auth/supabase-ssr';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleAuthorizationRepository } from '@/infrastructure/db/repositories/drizzle-authorization-repository';
import { DrizzleStage6Repository } from '@/infrastructure/db/repositories/drizzle-stage6-repository';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';
import { ALPHA_ORGANIZATION_ID, BETA_ORGANIZATION_ID, createStage3Actor } from '@/infrastructure/testing/stage3-fixture';
import { getStage6E2eFixture } from '@/app/stage6-test-composition';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { UpstashRateLimitAdapter } from '@/infrastructure/redis/upstash-rate-limit';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';

const querySchema = z.object({ organizationId: z.uuid(), view: z.enum(['settings', 'customers']), customerId: z.uuid().optional() });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() }).strict();
const e2eOrganizations = new Set([ALPHA_ORGANIZATION_ID, BETA_ORGANIZATION_ID]); const isE2e = () => process.env.APP_ENVIRONMENT === 'test' && process.env.STAGE2_E2E_MODE === '1';
const e2eRatePort = new InMemoryRateLimitAdapter();
const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
interface Context { readonly actor: AuthorizedTenantActorContext; readonly repository: DrizzleStage6Repository | ReturnType<typeof getStage6E2eFixture>['repository']; readonly apiKeys: ApiKeyService; readonly customers: CustomerService; readonly telegramMappings: TelegramMappingService; readonly rateLimits: RateLimitService; readonly policy: { allowance: number; windowSeconds: number; failureMode: 'closed' }; close(): Promise<void> }
type ContextResult = Context | PublicErrorEnvelope; const isError = (value: ContextResult): value is PublicErrorEnvelope => 'error' in value;

async function contextFor(organizationId: string, requestId: string): Promise<ContextResult> {
  const cookieStore = await cookies();
  if (isE2e()) {
    if (cookieStore.get('indicate-stage2-session')?.value !== 'stage2-valid' || !e2eOrganizations.has(organizationId)) return createNonDisclosingDenial(requestId);
    const actor = createStage3Actor(organizationId, requestId); const repository = getStage6E2eFixture().repository; const identifiers = new UuidGenerator();
    return { actor, repository, apiKeys: new ApiKeyService(repository, identifiers), customers: new CustomerService(repository, identifiers), telegramMappings: new TelegramMappingService(repository, identifiers), rateLimits: new RateLimitService(e2eRatePort), policy: { allowance: 100, windowSeconds: 60, failureMode: 'closed' }, close: async () => undefined };
  }
  const publicConfig = getPublicConfig(process.env); const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, anonKey: publicConfig.supabaseAnonKey, cookies: { getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), setAll: (values) => { for (const { name, value, options } of values) cookieStore.set(name, value, options); } } });
  const identity = await auth.verifyCookieSession(); if (identity === null) return createNonDisclosingDenial(requestId);
  const config = getRuntimeConfig(); const runtime = createRuntimeDatabase(config); const authorization = new DrizzleAuthorizationRepository(runtime.db); const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator()); if (!local.ok) { await runtime.close(); return createNonDisclosingDenial(requestId); }
  const membership = await authorization.findActiveMembership(organizationId, local.value.id); if (membership === null || !membership.roleActive) { await runtime.close(); return createNonDisclosingDenial(requestId); }
  const actor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(membership.permissions), entryPoint: 'cms', requestId }; const repository = new DrizzleStage6Repository(runtime.db); const identifiers = new UuidGenerator();
  return { actor, repository, apiKeys: new ApiKeyService(repository, identifiers), customers: new CustomerService(repository, identifiers), telegramMappings: new TelegramMappingService(repository, identifiers), rateLimits: new RateLimitService(new UpstashRateLimitAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })), policy: { ...config.rateLimits.mutation, failureMode: 'closed' }, close: runtime.close };
}
function response(error: PublicErrorEnvelope) { const retry = error.error.fields?.retryAfterSeconds?.[0]; return NextResponse.json(error, { status: statusFor(error), ...(retry === undefined ? {} : { headers: { 'Retry-After': retry } }) }); }

export async function GET(request: Request) {
  const requestId = crypto.randomUUID(); const url = new URL(request.url); const parsed = querySchema.safeParse({ organizationId: url.searchParams.get('organizationId'), view: url.searchParams.get('view'), customerId: url.searchParams.get('customerId') ?? undefined }); if (!parsed.success) return response(createNonDisclosingDenial(requestId));
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return response(context);
  try {
    if (parsed.data.view === 'customers') { const result = parsed.data.customerId === undefined ? await context.customers.list(context.actor) : await context.customers.read(context.actor, parsed.data.customerId); return result.ok ? NextResponse.json(result.value) : response(result.error); }
    const [keys, subscription, telegramMappings] = await Promise.all([context.apiKeys.list(context.actor), context.customers.readSubscription(context.actor), context.telegramMappings.list(context.actor)]); if (!keys.ok) return response(keys.error); if (!subscription.ok) return response(subscription.error); if (!telegramMappings.ok) return response(telegramMappings.error); return NextResponse.json({ apiKeys: keys.value, subscription: subscription.value, telegramMappings: telegramMappings.value });
  } finally { await context.close(); }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID(); const parsed = commandSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Invalid Stage 6 command.', requestId));
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return response(context);
  try {
    const limited = await context.rateLimits.enforce(context.rateLimits.authenticatedKey('cms-mutation', context.actor), context.policy, requestId); if (!limited.ok) return response(limited.error);
    const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'api-key.issue': (payload) => context.apiKeys.issue(context.actor, payload), 'api-key.rotate': (payload) => context.apiKeys.rotate(context.actor, payload), 'api-key.revoke': (payload) => context.apiKeys.revoke(context.actor, payload),
      'telegram-mapping.create': (payload) => context.telegramMappings.create(context.actor, payload), 'telegram-mapping.update': (payload) => context.telegramMappings.update(context.actor, payload),
      'customer.create': (payload) => context.customers.create(context.actor, payload), 'customer.update': (payload) => context.customers.update(context.actor, payload), 'subscription.update': (payload) => context.customers.updateSubscription(context.actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return response(createPublicError('INVALID_INPUT', 'Unknown Stage 6 command.', requestId)); const result = await action(parsed.data.payload); return result.ok ? NextResponse.json(result.value) : response(result.error);
  } finally { await context.close(); }
}
