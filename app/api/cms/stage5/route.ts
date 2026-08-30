import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveVerifiedLocalUser } from '@/application/auth/resolve-authenticated-user';
import { Stage5OperationPendingError } from '@/application/stage5/domain-provisioning-service';
import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { createSupabaseSsrAuthAdapter } from '@/infrastructure/auth/supabase-ssr';
import { DrizzleAuthorizationRepository } from '@/infrastructure/db/repositories/drizzle-authorization-repository';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { Stage5ConflictError, Stage5ResourceUnavailableError } from '@/ports/stage5-repository';
import { createNonDisclosingDenial, createPublicError } from '@/shared/errors/application-error';
import { getPublicConfig } from '@/config/public';
import { stage5OperationsComposition } from '../../../stage5-operations-composition';

const commandSchema = z.object({ organizationId: z.uuid(), siteId: z.uuid(), action: z.enum(['activate', 'deactivate']), hostname: z.string().min(1).max(253), previousHostname: z.string().min(1).max(253).nullable().optional() });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid Stage 5 command.', requestId), { status: 400 });
  const composition = stage5OperationsComposition();
  try {
    const cookieStore = await cookies();
    const publicConfig = getPublicConfig(process.env);
    const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, anonKey: publicConfig.supabaseAnonKey, cookies: { getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), setAll: (values) => { for (const { name, value, options } of values) cookieStore.set(name, value, options); } } });
    const identity = await auth.verifyCookieSession(); if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const authorization = new DrizzleAuthorizationRepository(composition.runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator()); if (!local.ok) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const membership = await authorization.findActiveMembership(parsed.data.organizationId, local.value.id);
    if (membership === null || !membership.roleActive || !membership.permissions.has('sites.manage')) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const actor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId: parsed.data.organizationId, permissionSet: new Set(membership.permissions), entryPoint: 'cms', requestId };
    if (parsed.data.action === 'activate') {
      const context = await composition.provisioning.activate(actor, parsed.data.siteId, parsed.data.hostname, new Date(), parsed.data.previousHostname ?? null);
      return NextResponse.json(context);
    }
    await composition.provisioning.deactivate(actor, parsed.data.siteId, parsed.data.hostname);
    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (error instanceof Stage5OperationPendingError) return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The domain operation is durably pending and will be retried.', requestId), { status: 503 });
    if (error instanceof Stage5ConflictError) return NextResponse.json(createPublicError('CONFLICT', 'The domain operation conflicts with current state.', requestId), { status: 409 });
    if (error instanceof Stage5ResourceUnavailableError) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (error instanceof Error && error.message === 'CONFIGURATION_INVALID') return NextResponse.json(createPublicError('CONFIGURATION_INVALID', 'The domain configuration is invalid.', requestId), { status: 400 });
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The domain operation is currently unavailable.', requestId), { status: 503 });
  }
  finally { await composition.runtime.close(); }
}
