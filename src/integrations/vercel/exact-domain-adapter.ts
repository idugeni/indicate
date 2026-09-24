import 'server-only';
import type { ExactDomainAssociationResult, VercelHostingPort } from '@/integrations/vercel/ports';

const INLINE_RETRY_MAX_ATTEMPTS = 3;
const INLINE_RETRY_MAX_DELAY_MS = 5_000;
const RATE_LIMIT_CLAMP_SECONDS = 60;

/**
 * Parses a Retry-After header into seconds.
 *
 * @param value - Raw Retry-After header (delay seconds or HTTP date).
 * @param now - Reference time for HTTP-date values.
 * @returns Delay in seconds, or null when absent or unparsable.
 */
export function parseRetryAfterSeconds(value: string | null, now = Date.now()): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const time = new Date(trimmed).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.ceil((time - now) / 1000));
}

function backoffWithJitterMs(attempt: number, retryAfterMs: number): number {
  const exponential = Math.min(retryAfterMs, 250 * 2 ** attempt);
  return exponential + Math.floor(Math.random() * 250);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class VercelExactDomainAdapter implements VercelHostingPort {
  readonly projectCount = 1 as const;
  readonly responsibility = 'application_hosting_only' as const;
  constructor(private readonly projectId: string, private readonly teamId: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch) {}
  private async call(path: string, init?: RequestInit, attempt = 0): Promise<Record<string, unknown>> {
    const response = await this.fetcher(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(this.teamId)}`, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...init?.headers } });
    if (response.status === 429) {
      const retryAfter = Math.min(Math.max(parseRetryAfterSeconds(response.headers.get('retry-after')) ?? 1, 0), RATE_LIMIT_CLAMP_SECONDS);
      if (attempt + 1 < INLINE_RETRY_MAX_ATTEMPTS && retryAfter * 1000 <= INLINE_RETRY_MAX_DELAY_MS) {
        await sleep(backoffWithJitterMs(attempt, retryAfter * 1000));
        return this.call(path, init, attempt + 1);
      }
      throw new Error(`vercel_rate_limited:retry_after_${retryAfter}`);
    }
    if (!response.ok) throw new Error('vercel_unavailable');
    return response.json() as Promise<Record<string, unknown>>;
  }
  private requireExact(hostname: string) { if (hostname.includes('\u002a')) throw new Error('non_exact_domain_prohibited'); }
  private result(hostname: string, body: Record<string, unknown>): ExactDomainAssociationResult { const verification = Array.isArray(body.verification) ? body.verification.find((item): item is { type: string; domain: string; value: string } => typeof item === 'object' && item !== null && (item as { type?: string }).type === 'TXT') : undefined; return { hostname, associated: body.name === hostname, verified: body.verified === true, ...(verification === undefined ? {} : { verificationChallenge: { type: 'TXT', name: verification.domain, value: verification.value } }) }; }
  async check() { try { await this.call(`/v9/projects/${this.projectId}`); return { service: 'vercel', status: 'healthy' as const }; } catch { return { service: 'vercel', status: 'unhealthy' as const, category: 'vercel_unavailable' }; } }
  async inspectExactDomain(hostname: string): Promise<ExactDomainAssociationResult> { this.requireExact(hostname); return this.result(hostname, await this.call(`/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`)); }
  async associateExactDomain(hostname: string): Promise<ExactDomainAssociationResult> { this.requireExact(hostname); try { return this.result(hostname, await this.call(`/v10/projects/${this.projectId}/domains`, { method: 'POST', body: JSON.stringify({ name: hostname }) })); } catch { return this.inspectExactDomain(hostname); } }
  async removeExactDomain(hostname: string) { this.requireExact(hostname); const path = `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`; const response = await this.fetcher(`https://api.vercel.com${path}?teamId=${encodeURIComponent(this.teamId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } }); if (response.status === 404) return; if (response.status === 429) { const retryAfter = Math.min(Math.max(parseRetryAfterSeconds(response.headers.get('retry-after')) ?? 1, 0), RATE_LIMIT_CLAMP_SECONDS); throw new Error(`vercel_rate_limited:retry_after_${retryAfter}`); } if (!response.ok) throw new Error('vercel_unavailable'); }
  async verifyExactDomain(hostname: string) { this.requireExact(hostname); const body = await this.call(`/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}/verify`, { method: 'POST' }); return body.name === hostname && body.verified === true; }
}
