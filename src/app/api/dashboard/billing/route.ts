import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { BillingService } from '@/modules/billing/billing-service';
import type { ActorContext } from '@/core/operation-context';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const getSchema = z.object({
  scope: z.enum(['subscription-state', 'invoices']),
  organizationId: z.uuid().optional(),
});
const commandSchema = z.object({ action: z.string().min(1).max(100), payload: z.unknown() }).strict();

/**
 * Maps a billing envelope to its HTTP status.
 *
 * @param error - Envelope produced by `BillingService` or denial helpers.
 * @returns Status code honoring 403 for platform-only denials.
 */
export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
function response(error: PublicErrorEnvelope) {
  const retry = error.error.fields?.retryAfterSeconds?.[0];
  return NextResponse.json(error, { status: statusFor(error), ...(retry === undefined ? {} : { headers: { 'Retry-After': retry } }) });
}

interface Session { readonly actor: ActorContext; readonly close: () => Promise<void> }

async function sessionFor(requestId: string): Promise<Session | PublicErrorEnvelope> {
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return createNonDisclosingDenial(requestId);
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const authorization = new DrizzleAuthorizationRepository(runtime.db);
  const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
  if (!local.ok || local.value.status !== 'active') { return createNonDisclosingDenial(requestId); }
  const platformPermissions = await authorization.listPlatformPermissions(local.value.id);
  const actor: ActorContext = {
    actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId: null,
    permissionSet: new Set(), platformPermissionSet: new Set(platformPermissions), entryPoint: 'dashboard', requestId,
  };
  return { actor, close: async () => undefined };
}

async function withService<T>(session: Session, run: (service: BillingService) => Promise<T>): Promise<T> {
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  try {
    const service = new BillingService(new DrizzleBillingRepository(runtime.db));
    return await run(service);
  } finally {
    await session.close();
  }
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const parsed = getSchema.safeParse({ scope: url.searchParams.get('scope'), organizationId: url.searchParams.get('organizationId') ?? undefined });
  if (!parsed.success) return response(createNonDisclosingDenial(requestId));
  const session = await sessionFor(requestId);
  if ('error' in session) return response(session);
  try {
    return await withService(session, async (service) => {
      const scope = parsed.data.scope;
      if (scope === 'subscription-state' && parsed.data.organizationId !== undefined) {
        const result = await service.subscriptionState(session.actor, parsed.data.organizationId);
        return result.ok ? NextResponse.json(result.value) : response(result.error);
      }
      if (scope === 'invoices' && parsed.data.organizationId !== undefined) {
        const result = await service.listInvoices(session.actor, parsed.data.organizationId);
        return result.ok ? NextResponse.json(result.value) : response(result.error);
      }
      return response(createPublicError('INVALID_INPUT', 'Invalid billing query.', requestId));
    });
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Billing is temporarily unavailable.', requestId));
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return response(createNonDisclosingDenial(requestId));
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response(createPublicError('INVALID_INPUT', 'Invalid billing command.', requestId));
  const session = await sessionFor(requestId);
  if ('error' in session) return response(session);
  try {
    return await withService(session, async (service) => {
      const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
        'invite.create': (payload) => service.createInvitation(session.actor, payload),
        'invite.redeem': (payload) => service.redeemInvitation(session.actor, payload),
        'invoice.create': (payload) => service.createInvoice(session.actor, payload),
        'invoice.void': (payload) => service.voidInvoice(session.actor, payload),
      };
      const action = actions[parsed.data.action];
      if (action === undefined) return response(createPublicError('INVALID_INPUT', 'Unknown billing command.', requestId));
      const result = await action(parsed.data.payload);
      return result.ok ? NextResponse.json(result.value) : response(result.error);
    });
  } catch {
    return response(createPublicError('DEPENDENCY_UNAVAILABLE', 'Billing is temporarily unavailable.', requestId));
  }
}

export const GET = withApiAccess('GET /api/dashboard/billing', handleGET);
export const POST = withApiAccess('POST /api/dashboard/billing', handlePOST);
