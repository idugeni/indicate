import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';

const headers = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };

const PENDING_ATTEMPT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * Check a pending-activation attempt id.
 *
 * @param value - Raw attempt query param.
 * @returns True only for a well-formed UUID.
 */
export function isPendingAttemptId(value: string | null): boolean {
  return value !== null && PENDING_ATTEMPT_PATTERN.test(value);
}

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
