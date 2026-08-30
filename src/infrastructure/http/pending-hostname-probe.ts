import 'server-only';
import type { PendingHostnameProbePort } from '@/ports/public-probe';

export class HttpsPendingHostnameProbe implements PendingHostnameProbePort {
  async verifyPendingHostname(hostname: string, attemptId: string): Promise<boolean> {
    const response = await fetch(`https://${hostname}/domain-pending?attempt=${encodeURIComponent(attemptId)}`, { redirect: 'manual', headers: { 'User-Agent': 'indicate-domain-probe/1' }, cache: 'no-store' });
    return response.status === 425 && response.headers.get('x-robots-tag') === 'noindex, nofollow' && response.headers.get('x-indicate-pending-attempt') === attemptId;
  }
}
