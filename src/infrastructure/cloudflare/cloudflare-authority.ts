import 'server-only';
import { resolveNs } from 'node:dns/promises';
import type { CloudflareAuthorityPort, CloudflareZoneStatus } from '@/ports/cloudflare';

interface CloudflareEnvelope<T> { readonly success: boolean; readonly result: T }
interface Zone { readonly id: string; readonly name: string; readonly name_servers: string[] }
export class CloudflareAuthorityAdapter implements CloudflareAuthorityPort {
  readonly authority = 'nameservers_dns_wildcard_ssl_proxy_cdn' as const;
  constructor(private readonly accountId: string, private readonly token: string, private readonly zoneIds: readonly string[], private readonly expectedNameservers: readonly string[], private readonly productionTarget: string, private readonly publicNsResolver: (hostname: string) => Promise<readonly string[]> = resolveNs) {}
  private async call<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...init?.headers } }); if (!response.ok) throw new Error('cloudflare_unavailable'); const body = await response.json() as CloudflareEnvelope<T>; if (!body.success) throw new Error('cloudflare_unavailable'); return body.result; }
  private async zone(hostname: string): Promise<Zone> { for (const id of this.zoneIds) { const zone = await this.call<Zone>(`/zones/${id}`); if (hostname === zone.name || hostname.endsWith(`.${zone.name}`)) return zone; } throw new Error('cloudflare_zone_unavailable'); }
  private normalizeNameservers(values: readonly string[]) { return [...new Set(values.map((value) => value.toLowerCase().replace(/\.$/u, '')))].sort(); }
  async check() { try { await this.call(`/accounts/${this.accountId}`); return { service: 'cloudflare', status: 'healthy' as const }; } catch { return { service: 'cloudflare', status: 'unhealthy' as const, category: 'cloudflare_unavailable' }; } }
  async verifyZone(hostname: string): Promise<CloudflareZoneStatus> {
    const zone = await this.zone(hostname);
    const records = await this.call<{ name: string; type: string; content: string; proxied?: boolean }[]>(`/zones/${zone.id}/dns_records?per_page=500`);
    const settings = await this.call<{ value: string }>(`/zones/${zone.id}/settings/ssl`);
    const assigned = this.normalizeNameservers(zone.name_servers);
    const configured = this.normalizeNameservers(this.expectedNameservers);
    const publicDelegation = this.normalizeNameservers(await this.publicNsResolver(zone.name));
    const nameserversAuthoritative = assigned.length >= 2 && assigned.every((name) => configured.includes(name));
    const publicDelegationAuthoritative = assigned.length === publicDelegation.length && assigned.every((name, index) => publicDelegation[index] === name);
    const route = (name: string) => records.some((record) => record.name === name && record.type === 'CNAME' && record.content === this.productionTarget && record.proxied === true);
    if (settings.value !== 'strict') throw new Error('cloudflare_ssl_not_strict');
    return { hostname, nameserversAuthoritative, publicDelegationAuthoritative, apexProxied: route(zone.name), wildcardProxied: route(`*.${zone.name}`), sslMode: 'full_strict' };
  }
  async ensureExactVerificationTxt(hostname: string, name: string, value: string) { const zone = await this.zone(hostname); const records = await this.call<{ name: string; content: string }[]>(`/zones/${zone.id}/dns_records?type=TXT&name=${encodeURIComponent(name)}`); if (records.some((record) => record.name === name && record.content === value)) return; await this.call(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'TXT', name, content: value, ttl: 60 }) }); }
  async removeExactVerificationTxt(hostname: string, name: string, value: string) { const zone = await this.zone(hostname); const records = await this.call<{ id: string; name: string; content: string }[]>(`/zones/${zone.id}/dns_records?type=TXT&name=${encodeURIComponent(name)}`); for (const record of records) if (record.name === name && record.content === value) await this.call(`/zones/${zone.id}/dns_records/${record.id}`, { method: 'DELETE' }); }
  async purgeExactUrls(urls: readonly string[]) {
    const byZone = new Map<string, string[]>();
    for (const raw of urls) {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') throw new Error('cloudflare_invalid_purge_url');
      const zone = await this.zone(url.hostname);
      const owned = byZone.get(zone.id) ?? [];
      owned.push(url.toString()); byZone.set(zone.id, owned);
    }
    for (const [zoneId, files] of byZone) await this.call(`/zones/${zoneId}/purge_cache`, { method: 'POST', body: JSON.stringify({ files }) });
  }
  async purgeHostname(hostname: string) { const zone = await this.zone(hostname); await this.call(`/zones/${zone.id}/purge_cache`, { method: 'POST', body: JSON.stringify({ hosts: [hostname] }) }); }
}
