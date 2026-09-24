import 'server-only';
import { resolveNs } from 'node:dns/promises';
import type { CloudflareAuthorityPort, CloudflareDomainVerification, CloudflareZoneStatus } from '@/integrations/cloudflare/ports';

interface CloudflareEnvelope<T> { readonly success: boolean; readonly result: T; readonly errors?: readonly { code?: number; message?: string }[] }
interface Zone { readonly id: string; readonly name: string; readonly name_servers: string[] }
interface DnsRecord { readonly name: string; readonly type: string; readonly content: string; readonly proxied?: boolean }
interface SslSetting { readonly value: string }

const MAX_PURGE_FILES_PER_REQUEST = 30;

/** Social preview crawlers bypass the probe challenge; must stay the first custom WAF rule. */
export const CRAWLER_SKIP_EXPRESSION =
  '(lower(http.user_agent) contains "facebookexternalhit") or (lower(http.user_agent) contains "twitterbot") or (lower(http.user_agent) contains "linkedinbot") or (lower(http.user_agent) contains "whatsapp") or (lower(http.user_agent) contains "telegrambot") or (lower(http.user_agent) contains "slackbot") or (lower(http.user_agent) contains "discordbot")';

interface FirewallRule {
  readonly id?: string;
  readonly action: string;
  readonly action_parameters?: Readonly<Record<string, unknown>>;
  readonly description?: string;
  readonly enabled?: boolean;
  readonly expression: string;
}

interface FirewallEntrypoint {
  readonly description?: string;
  readonly rules: FirewallRule[];
}

export function canonicalizeNameservers(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.toLowerCase().replace(/\.$/u, '')))].sort();
}

/** Per-zone authority; every operation is scoped to the passed Zone ID.
 *
 * @remarks Rate-limit details stay in the message (observability); bounded retry is handled by the invalidation dispatcher via failInvalidation, not here. Exact lookup first, then paginated suffix scan: this account holds hundreds of zones so one page (per_page=50) is never enough.
 */
export class CloudflareAuthorityAdapter implements CloudflareAuthorityPort {
  readonly authority = 'nameservers_dns_wildcard_ssl_proxy_cdn' as const;

  constructor(
    private readonly accountId: string,
    private readonly token: string,
    private readonly productionTarget: string,
    private readonly publicNsResolver: (hostname: string) => Promise<readonly string[]> = resolveNs,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(`https://api.cloudflare.com/client/v4${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...init?.headers },
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') ?? 'unknown';
      throw new Error(`cloudflare_rate_limited:retry_after_${retryAfter}`);
    }
    if (!response.ok) throw new Error('cloudflare_unavailable');
    const body = (await response.json()) as CloudflareEnvelope<T>;
    if (!body.success) throw new Error(`cloudflare_unavailable${body.errors?.[0]?.code !== undefined ? ':' + body.errors[0].code : ''}`);
    return body.result;
  }

  async check() {
    try {
      await this.call<{ id: string }>(`/accounts/${this.accountId}`);
      return { service: 'cloudflare', status: 'healthy' as const };
    } catch {
      return { service: 'cloudflare', status: 'unhealthy' as const, category: 'cloudflare_unavailable' };
    }
  }

  /** Verifies one Domain against its owning zone (zone ID from persisted record; zone name must equal the hostname or be its parent suffix for regional sites). */
  async verifyDomainZone(input: { domainId: string; normalizedHostname: string; cloudflareZoneId: string; productionTarget?: string }): Promise<CloudflareDomainVerification> {
    const zone = await this.call<Zone>(`/zones/${input.cloudflareZoneId}`);
    if (zone.name !== input.normalizedHostname && !input.normalizedHostname.endsWith(`.${zone.name}`)) {
      return { domainId: input.domainId, zoneId: input.cloudflareZoneId, verified: false, category: 'zone_name_mismatch' };
    }
    const verification = await this.verifyKnownZone(input.normalizedHostname, zone, input.productionTarget ?? this.productionTarget);
    return {
      domainId: input.domainId,
      zoneId: input.cloudflareZoneId,
      verified: verification.nameserversAuthoritative && verification.publicDelegationAuthoritative && verification.apexProxied && verification.wildcardProxied && verification.sslMode === 'full_strict',
      category: verification.nameserversAuthoritative && verification.publicDelegationAuthoritative ? 'verified' : 'nameserver_mismatch',
    };
  }

  private async verifyKnownZone(hostname: string, zone: Zone, productionTarget: string): Promise<CloudflareZoneStatus> {
    const records = await this.call<DnsRecord[]>(`/zones/${zone.id}/dns_records?per_page=500`);
    const settings = await this.call<SslSetting>(`/zones/${zone.id}/settings/ssl`);
    const assigned = canonicalizeNameservers(zone.name_servers);
    const publicDelegation = canonicalizeNameservers(await this.publicNsResolver(zone.name));
    const nameserversAuthoritative = assigned.length >= 2;
    const publicDelegationAuthoritative = assigned.length === publicDelegation.length && assigned.every((name, index) => publicDelegation[index] === name);
    const route = (name: string) => records.some((record) => record.name === name && record.type === 'CNAME' && record.content === productionTarget && record.proxied === true);
    if (settings.value !== 'strict') throw new Error('cloudflare_ssl_not_strict');
    return {
      hostname,
      nameserversAuthoritative,
      publicDelegationAuthoritative,
      apexProxied: route(zone.name),
      wildcardProxied: route(`*.${zone.name}`),
      sslMode: 'full_strict',
    };
  }

  async ensureExactVerificationTxt(hostname: string, name: string, value: string) {
    const zone = await this.zoneForHostname(hostname);
    const records = await this.call<{ name: string; content: string }[]>(`/zones/${zone.id}/dns_records?type=TXT&name=${encodeURIComponent(name)}`);
    if (records.some((record) => record.name === name && record.content === value)) return;
    await this.call(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'TXT', name, content: value, ttl: 60 }) });
  }

  async removeExactVerificationTxt(hostname: string, name: string, value: string) {
    const zone = await this.zoneForHostname(hostname);
    const records = await this.call<{ id: string; name: string; content: string }[]>(`/zones/${zone.id}/dns_records?type=TXT&name=${encodeURIComponent(name)}`);
    for (const record of records) if (record.name === name && record.content === value) await this.call(`/zones/${zone.id}/dns_records/${record.id}`, { method: 'DELETE' });
  }

  /**
   * Ensures the crawler skip rule heads the zone custom WAF ruleset.
   *
   * @param cloudflareZoneId - Owning zone ID.
   */
  async ensureCrawlerSkipRule(cloudflareZoneId: string): Promise<void> {
    const entrypoint = await this.call<FirewallEntrypoint>(`/zones/${cloudflareZoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`);
    if (entrypoint.rules.length > 0 && entrypoint.rules[0]?.action === 'skip') return;
    const rules: FirewallRule[] = [
      { action: 'skip', action_parameters: { ruleset: 'current' }, description: 'Allow social preview crawlers', enabled: true, expression: CRAWLER_SKIP_EXPRESSION },
      ...entrypoint.rules.map((rule) => ({
        ...(rule.id === undefined ? {} : { id: rule.id }),
        action: rule.action,
        ...(rule.action_parameters === undefined ? {} : { action_parameters: { ...rule.action_parameters } }),
        ...(rule.description === undefined ? {} : { description: rule.description }),
        enabled: rule.enabled ?? true,
        expression: rule.expression,
      })),
    ];
    await this.call(`/zones/${cloudflareZoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`, {
      method: 'PUT',
      body: JSON.stringify({ description: entrypoint.description ?? 'tenant probes', rules }),
    });
  }

  private readonly zoneCache = new Map<string, Zone>();

  private async zoneForHostname(hostname: string): Promise<Zone> {
    const hit = this.zoneCache.get(hostname);
    if (hit !== undefined) return hit;
    const exact = await this.call<Zone[]>(`/zones?name=${encodeURIComponent(hostname)}&per_page=5`);
    const direct = exact.find((zone) => zone.name === hostname);
    if (direct !== undefined) {
      this.zoneCache.set(hostname, direct);
      return direct;
    }
    for (let page = 1; ; page += 1) {
      const zones = await this.call<Zone[]>(`/zones?per_page=50&page=${page}`);
      const match = zones.find((zone) => hostname === zone.name || hostname.endsWith(`.${zone.name}`));
      if (match !== undefined) {
        this.zoneCache.set(hostname, match);
        return match;
      }
      if (zones.length < 50) break;
    }
    throw new Error('cloudflare_zone_unavailable');
  }

  async purgeExactUrls(urls: readonly string[]) {
    if (urls.length === 0) return;
    const failures: string[] = [];
    const byZone = new Map<string, string[]>();
    for (const raw of urls) {
      try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') throw new Error('cloudflare_invalid_purge_url');
        const zone = await this.zoneForHostname(url.hostname);
        const owned = byZone.get(zone.id) ?? [];
        owned.push(url.toString());
        byZone.set(zone.id, owned);
      } catch {
        failures.push(raw);
      }
    }
    for (const [zoneId, files] of byZone) {
      for (let index = 0; index < files.length; index += MAX_PURGE_FILES_PER_REQUEST) {
        const chunk = files.slice(index, index + MAX_PURGE_FILES_PER_REQUEST);
        try {
          await this.call(`/zones/${zoneId}/purge_cache`, { method: 'POST', body: JSON.stringify({ files: chunk }) });
        } catch {
          failures.push(...chunk);
        }
      }
    }
    if (failures.length > 0) throw new Error(`cloudflare_partial_purge:${failures.length}`);
  }

  async purgeHostname(hostname: string) {
    const zone = await this.zoneForHostname(hostname);
    await this.call(`/zones/${zone.id}/purge_cache`, { method: 'POST', body: JSON.stringify({ hosts: [hostname] }) });
  }
}