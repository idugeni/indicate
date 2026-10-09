import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import { isPendingAttemptId } from './route-helpers';

const headers = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };

async function handleGET(request: Request) {
  const parsed = normalizeRequestHostname(request.headers.get('host'));
  if (!parsed.ok) return new Response('Invalid Host', { status: 400, headers });
  const attemptId = new URL(request.url).searchParams.get('attempt');
  if (attemptId === null || !isPendingAttemptId(attemptId)) return new Response('Not Found', { status: 404, headers });
  const { repository, config } = await deliveryComposition();
  if (config.hosts.reserved.has(parsed.hostname) || !await repository.findPendingActivation(parsed.hostname, attemptId)) return new Response('Not Found', { status: 404, headers });
  return new Response('Pending hostname verification', { status: 425, headers: { ...headers, 'X-Indicate-Pending-Attempt': attemptId } });
}

export const GET = withApiAccess('GET /domain-pending', handleGET);
