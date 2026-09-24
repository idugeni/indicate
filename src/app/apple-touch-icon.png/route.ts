import { connection } from 'next/server';
import { withApiAccess } from '@/core/observability/api-access';
import { serveBrandIcon } from '@/modules/site/brand-icons';

async function handleGET(request: Request) {
  await connection();
  return serveBrandIcon(request);
}

/**
 * Serve the tenant Apple touch icon as stable same-host bytes.
 *
 * @remarks Same bytes as `/icon.png`: the single 512px PNG master scales to every surface, so no per-size variant exists to invalidate.
 */
export const GET = withApiAccess('GET /apple-touch-icon.png', handleGET, { accessLog: 'errors-only' });
