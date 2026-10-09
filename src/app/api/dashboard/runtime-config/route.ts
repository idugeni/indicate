import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDashboardUser } from '@/modules/auth/authenticate-dashboard';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext, invalidateServerRuntimeConfig } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleRuntimeConfigAdminRepository, RuntimeConfigAdminAccessDeniedError, RuntimeConfigAdminConflictError } from '@/data/repos/runtime-config/admin';
import { mediaPolicySchema } from '@/core/config/persisted/persisted-schema';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { runtimeConfigErrorStatus } from './route-helpers';

const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('media-policy.save'), policy: mediaPolicySchema }),
]);

async function handleGET() {
  const requestId = crypto.randomUUID();
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  {
    const repository = new DrizzleRuntimeConfigAdminRepository(runtime.db);
    try {
      const [policy, policies] = await Promise.all([
        repository.readMediaPolicy(user.authUserId, user.localUserId),
        repository.readPoliciesOverview(user.authUserId, user.localUserId),
      ]);
      return NextResponse.json({ policy, policies });
    } catch (error) {
      if (error instanceof RuntimeConfigAdminAccessDeniedError) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The runtime configuration could not be read.', requestId), { status: runtimeConfigErrorStatus(error) });
    }
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid runtime configuration command.', requestId), { status: 400 });
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  {
    const repository = new DrizzleRuntimeConfigAdminRepository(runtime.db);
    try {
      const policy = parsed.data.policy;
      const result = await repository.updateMediaPolicy(user.authUserId, user.localUserId, {
        allowedMimeTypes: [...policy.allowedMimeTypes],
        maxObjectBytes: policy.maxObjectBytes,
        uploadAuthorizationSeconds: policy.uploadAuthorizationSeconds,
        readAuthorizationSeconds: policy.readAuthorizationSeconds,
        expectedVersion: policy.version,
      });
      await invalidateServerRuntimeConfig(context.bootstrap.environment);
      return NextResponse.json({ ok: true, version: result.version });
    } catch (error) {
      if (error instanceof RuntimeConfigAdminAccessDeniedError) return NextResponse.json(createNonDisclosingDenial(requestId), { status: runtimeConfigErrorStatus(error) });
      if (error instanceof RuntimeConfigAdminConflictError) return NextResponse.json(createPublicError('CONFLICT', 'Kebijakan berubah sebelum penyimpanan. Muat ulang lalu coba lagi.', requestId), { status: runtimeConfigErrorStatus(error) });
      return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The runtime configuration operation could not be completed.', requestId), { status: runtimeConfigErrorStatus(error) });
    }
  }
}

export { handleGET as GET, handlePOST as POST };
