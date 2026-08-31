import 'server-only';
import type { ExactDomainAssociationResult, VercelHostingPort } from '@/ports/vercel-domain';

export class VercelExactDomainAdapter implements VercelHostingPort {
  readonly projectCount = 1 as const;
  readonly responsibility = 'application_hosting_only' as const;
  constructor(private readonly projectId: string, private readonly teamId: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch) {}
  private async call(path: string, init?: RequestInit) { const response = await this.fetcher(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(this.teamId)}`, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...init?.headers } }); if (!response.ok) throw new Error('vercel_unavailable'); return response.json() as Promise<Record<string, unknown>>; }
  private requireExact(hostname: string) { if (hostname.includes('\u002a')) throw new Error('non_exact_domain_prohibited'); }
  private result(hostname: string, body: Record<string, unknown>): ExactDomainAssociationResult { const verification = Array.isArray(body.verification) ? body.verification.find((item): item is { type: string; domain: string; value: string } => typeof item === 'object' && item !== null && (item as { type?: string }).type === 'TXT') : undefined; return { hostname, associated: body.name === hostname, verified: body.verified === true, ...(verification === undefined ? {} : { verificationChallenge: { type: 'TXT', name: verification.domain, value: verification.value } }) }; }
  async check() { try { await this.call(`/v9/projects/${this.projectId}`); return { service: 'vercel', status: 'healthy' as const }; } catch { return { service: 'vercel', status: 'unhealthy' as const, category: 'vercel_unavailable' }; } }
  async inspectExactDomain(hostname: string): Promise<ExactDomainAssociationResult> { this.requireExact(hostname); return this.result(hostname, await this.call(`/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`)); }
  async associateExactDomain(hostname: string): Promise<ExactDomainAssociationResult> { this.requireExact(hostname); try { return this.result(hostname, await this.call(`/v10/projects/${this.projectId}/domains`, { method: 'POST', body: JSON.stringify({ name: hostname }) })); } catch { return this.inspectExactDomain(hostname); } }
  async removeExactDomain(hostname: string) { this.requireExact(hostname); const path = `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`; const response = await fetch(`https://api.vercel.com${path}?teamId=${encodeURIComponent(this.teamId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } }); if (response.status === 404) return; if (!response.ok) throw new Error('vercel_unavailable'); }
  async verifyExactDomain(hostname: string) { this.requireExact(hostname); const body = await this.call(`/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}/verify`, { method: 'POST' }); return body.name === hostname && body.verified === true; }
}
