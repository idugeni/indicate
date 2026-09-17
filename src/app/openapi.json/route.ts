import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import { buildOpenApiDocument } from '@/modules/docs/openapi';

async function handleGET() {
  await connection();
  const { resolver } = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  if (result.kind !== 'control' || result.surface !== 'docs') {
    return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  }
  const { config } = await deliveryComposition();
  return new Response(JSON.stringify(buildOpenApiDocument(config.hosts.api), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600',
    },
  });
}

export const GET = withApiAccess('GET /openapi.json', handleGET);
