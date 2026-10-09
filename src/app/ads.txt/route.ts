import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';

/**
 * Render a placeholder ads.txt with no authorized sellers yet.
 *
 * @param host - Request hostname for the header line.
 * @param contactUrl - Absolute partnership contact URL.
 * @returns Valid comment-only ads.txt body per IAB spec.
 */
function adsTxt(host: string, contactUrl: string): string {
  return [
    `# ads.txt for ${host}`,
    '# No authorized programmatic sellers yet.',
    `# Contact ${contactUrl} for partnerships.`,
    '',
  ].join('\n');
}

async function handleGET() {
  await connection();
  const { resolver, config } = await deliveryComposition();
  const result = await resolver.classify((await headers()).get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(adsTxt(config.hosts.dashboard, `https://${config.hosts.dashboard}/contact`), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
    });
  }
  if (result.kind === 'site') {
    const host = result.context.normalizedHostname;
    return new Response(adsTxt(host, `https://${host}/kontak`), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
    });
  }
  return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
}

/**
 * Serve the per-host ads.txt backing the WAF Allowed paths checklist.
 *
 * @remarks Static body, no database read; replace with real seller lines on ads onboarding.
 */
const GET = withApiAccess('GET /ads.txt', handleGET, { accessLog: 'errors-only' });
