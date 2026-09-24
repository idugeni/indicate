import { connection } from 'next/server';
import { withApiAccess } from '@/core/observability/api-access';
import { serveBrandIcon } from '@/modules/site/brand-icons';

async function handleGET(request: Request) {
  await connection();
  return serveBrandIcon(request);
}

/**
 * Serve the tenant icon as stable same-host bytes.
 *
 * @remarks Stays outside `/api/` so tenant `robots.txt` never blocks it and the global `/api/:path*` no-store rule never applies; the year-long edge cache makes repeat crawls free at the origin.
 */
export const GET = withApiAccess('GET /icon.png', handleGET, { accessLog: 'errors-only' });
