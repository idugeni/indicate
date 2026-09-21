import { connection, NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { withApiAccess } from '@/core/observability/api-access';

async function handleGET() {
  await connection();
  const context = await getServerRuntimeContext();
  return NextResponse.json(
    {
      service: 'indicate',
      deploymentStatus: 'foundation',
      status: 'ok',
      configuration: 'valid',
      environment: context.bootstrap.environment,
      configurationSource: 'postgres',
      configurationVersion: context.snapshot.configurationVersion,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

/**
 * Return the service status.
 *
 * @remarks Health reads the config snapshot per request: stays dynamic.
 */
export const GET = withApiAccess('GET /api/health', handleGET);