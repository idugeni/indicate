import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { ApiKeyService } from '@/modules/integrations/api-key-service';
import { CustomerService } from '@/modules/integrations/customer-service';
import { EmailTestService } from '@/modules/integrations/email-test-service';
import { RateLimitService } from '@/modules/integrations/rate-limit-service';
import { TelegramMappingService } from '@/modules/integrations/telegram-mapping-service';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleIntegrationsRepository } from '@/data/repos/integrations';
import { createResendEmailApiAdapter } from '@/integrations/email/resend-email-api';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { UpstashRateLimitAdapter } from '@/integrations/redis/upstash-rate-limit';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { extractClientIp } from '@/core/routing/platform-guard';
import type { Result } from '@/core/result';

const querySchema = z.object({ organizationId: z.uuid(), view: z.enum(['settings', 'customers']), customerId: z.uuid().optional() });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() }).strict();
/**
 * Maps an integrations envelope to its HTTP status.
 *
 * @param error - Envelope produced by integration services or denial helpers.
 * @returns Status code honoring 429 for rate-limited webhook traffic.
 */
export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
interface Context { readonly actor: AuthorizedTenantActorContext; readonly repository: DrizzleIntegrationsRepository; readonly apiKeys: ApiKeyService; readonly customers: CustomerService; readonly telegramMappings: TelegramMappingService; readonly emailTest: EmailTestService; readonly emailStatus: { readonly configured: boolean; readonly defaultFrom: string | null; readonly webhook: boolean }; readonly rateLimits: RateLimitService; readonly policy: { allowance: number; windowSeconds: number; failureMode: 'closed' } }
type ContextResult = Context | PublicErrorEnvelope; const isError = (value: ContextResult): value is PublicErrorEnvelope => 'error' in value;

async function contextFor(organizationId: string, requestId: string): Promise<ContextResult> {
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env); const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey, cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }) });
  const identity = await auth.verifyCookieSession(); if (identity === null) return createNonDisclosingDenial(requestId);
  const context = await getServerRuntimeContext(); const config = context.config; const runtime = getSharedRuntimeDatabase(context.bootstrap); const authorization = new DrizzleAuthorizationRepository(runtime.db); const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator()); if (!local.ok) { return createNonDisclosingDenial(requestId); }
  const membership = await authorization.findActiveMembership(organizationId, local.value.id); if (membership === null || !membership.roleActive) { return createNonDisclosingDenial(requestId); }
  const actor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(membership.orgPermissions), platformPermissionSet: new Set(membership.platformPermissions), regionScopeId: membership.regionId ?? null, entryPoint: 'dashboard', requestId }; const repository = new DrizzleIntegrationsRepository(runtime.db); const identifiers = new UuidGenerator();
  const emailPort = config.email === null ? null : createResendEmailApiAdapter(config.email.apiKey, config.email.defaultFrom);
  return { actor, repository, apiKeys: new ApiKeyService(repository, identifiers), customers: new CustomerService(repository, identifiers), telegramMappings: new TelegramMappingService(repository, identifiers), emailTest: new EmailTestService(emailPort), emailStatus: config.email === null ? Object.freeze({ configured: false as const, defaultFrom: null, webhook: false as const }) : Object.freeze({ configured: true as const, defaultFrom: config.email.defaultFrom, webhook: config.email.webhookSecret !== null }), rateLimits: new RateLimitService(new UpstashRateLimitAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })), policy: { ...config.rateLimits.mutation, failureMode: 'closed' } };
}
function response(error: PublicErrorEnvelope) { const retry = error.error.fields?.retryAfterSeconds?.[0]; return NextResponse.json(error, { status: statusFor(error), ...(retry === undefined ? {} : { headers: { 'Retry-After': retry } }) }); }

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request); const url = new URL(request.url); const parsed = querySchema.safeParse({ organizationId: url.searchParams.get('organizationId'), view: url.searchParams.get('view'), customerId: url.searchParams.get('customerId') ?? undefined }); if (!parsed.success) return response(createNonDisclosingDenial(requestId));
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return response(context);
  {
    if (parsed.data.view === 'customers') { const result = parsed.data.customerId === undefined ? await context.customers.list(context.actor) : await context.customers.read(context.actor, parsed.data.customerId); return result.ok ? NextResponse.json(result.value) : response(result.error); }
    const [keys, subscription, telegramMappings, outbox] = await Promise.all([context.apiKeys.list(context.actor), context.customers.readSubscription(context.actor), context.telegramMappings.list(context.actor), context.telegramMappings.listOutbox(context.actor)]); if (!keys.ok) return response(keys.error); if (!subscription.ok) return response(subscription.error); if (!telegramMappings.ok) return response(telegramMappings.error); if (!outbox.ok) return response(outbox.error); return NextResponse.json({ apiKeys: keys.value, subscription: subscription.value, telegramMappings: telegramMappings.value, outbox: outbox.value, email: context.emailStatus });
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return response(createNonDisclosingDenial(requestId));
  const parsed = commandSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Invalid Integrations command.', requestId));
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return response(context);
  const clientIp = extractClientIp(request.headers);
  const consentIpHash = clientIp === null ? null : createHash('sha256').update(clientIp).digest('hex');
  const withConsent = (payload: unknown): unknown =>
    parsed.data.action === 'telegram-mapping.create' && typeof payload === 'object' && payload !== null
      ? { ...(payload as Record<string, unknown>), consentIpHash }
      : payload;
  {
    const limited = await context.rateLimits.enforce(context.rateLimits.authenticatedKey('dashboard-mutation', context.actor), context.policy, requestId); if (!limited.ok) return response(limited.error);
    const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'api-key.issue': (payload) => context.apiKeys.issue(context.actor, payload), 'api-key.rotate': (payload) => context.apiKeys.rotate(context.actor, payload), 'api-key.revoke': (payload) => context.apiKeys.revoke(context.actor, payload),
      'telegram-mapping.create': (payload) => context.telegramMappings.create(context.actor, withConsent(payload)), 'telegram-mapping.update': (payload) => context.telegramMappings.update(context.actor, payload), 'telegram.broadcast': (payload) => context.telegramMappings.broadcast(context.actor, payload),
      'email.test': (payload) => context.emailTest.send(context.actor, payload),
      'customer.create': (payload) => context.customers.create(context.actor, payload), 'customer.update': (payload) => context.customers.update(context.actor, payload), 'subscription.update': (payload) => context.customers.updateSubscription(context.actor, payload), 'membership.assign-first': (payload) => context.customers.assignFirstAdmin(context.actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return response(createPublicError('INVALID_INPUT', 'Unknown Integrations command.', requestId)); const result = await action(parsed.data.payload); return result.ok ? NextResponse.json(result.value) : response(result.error);
  }
}

export const GET = withApiAccess('GET /api/dashboard/integrations', handleGET);
/**
 * Dispatch dashboard Integrations commands.
 *
 * @remarks Consent trail penautan Telegram: hash IP admin pemohon (PENDING A6).
 */
export const POST = withApiAccess('POST /api/dashboard/integrations', handlePOST);
