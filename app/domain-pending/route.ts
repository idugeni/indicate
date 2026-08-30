import { normalizeRequestHostname } from '@/shared/hostname/normalize-request-hostname';
import { stage5Composition } from '../stage5-composition';

const headers = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const parsed = normalizeRequestHostname(request.headers.get('host'));
  if (!parsed.ok) return new Response('Invalid Host', { status: 400, headers });
  const attemptId = new URL(request.url).searchParams.get('attempt');
  if (attemptId === null || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(attemptId)) return new Response('Not Found', { status: 404, headers });
  const { repository, config } = stage5Composition();
  if (config.hosts.reserved.has(parsed.hostname) || !await repository.findPendingActivation(parsed.hostname, attemptId)) return new Response('Not Found', { status: 404, headers });
  return new Response('Pending hostname verification', { status: 425, headers: { ...headers, 'X-Indicate-Pending-Attempt': attemptId } });
}
