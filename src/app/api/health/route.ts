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
      /**
       * Whether the daily WORM audit export can run at all.
       *
       * @remarks The export route answers 503 on its own when this is
       * `unconfigured`, but nothing watches that route, so a missing bucket
       * silently stopped the daily export for fifteen days while audit rows kept
       * accumulating with no archive copy. Health is the one endpoint already
       * polled on a schedule, so the condition is reported here instead of only
       * inside the cron that fails.
       */
      auditExport: context.config.r2.audit === null ? 'unconfigured' : 'configured',
      /**
       * Whether `pub/` keys get their own bucket.
       *
       * @remarks Without a public bucket the storage adapter routes `pub/`
       * keys into the private bucket, and every read still resolves, so nothing
       * fails — the only trace is reconciliation drift nobody is watching.
       * Production separates media serving from private bytes; a deployment
       * that quietly stopped doing so is reporting itself here instead.
       */
      publicMediaBucket: context.config.r2.publicBucketName === null ? 'unconfigured' : 'configured',
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