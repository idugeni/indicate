import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { withApiAccess } from '@/core/observability/api-access';

export const dynamic = 'force-dynamic';

async function handleGET() {
  const context = await getServerRuntimeContext();
  return NextResponse.json(
    {
      service: 'indicate',
      deploymentStatus: 'foundation',
      status: 'ok',
      configuration: 'valid',
      environment: context.bootstrap.environment,
      configurationSource: context.source === 'postgres' ? 'postgres' : 'legacy',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export const GET = withApiAccess('GET /api/health', handleGET);