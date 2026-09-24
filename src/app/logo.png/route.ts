import { connection } from 'next/server';
import { withApiAccess } from '@/core/observability/api-access';
import { serveBrandLogo } from '@/modules/site/brand-icons';

async function handleGET(request: Request) {
  await connection();
  return serveBrandLogo(request);
}

/**
 * Serve the tenant logo as stable same-host bytes.
 *
 * @remarks Stays outside `/api/` so tenant `robots.txt` never blocks it and the global `/api/:path*` no-store rule never applies; the year-long edge cache removes the per-view signed redirect from header and footer renders.
 */
export const GET = withApiAccess('GET /logo.png', handleGET, { accessLog: 'errors-only' });
