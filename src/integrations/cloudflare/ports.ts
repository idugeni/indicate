import type { HealthCheckPort } from '@/core/system/ports';

export interface CloudflareZoneStatus {
  readonly hostname: string;
  readonly nameserversAuthoritative: boolean;
  readonly publicDelegationAuthoritative: boolean;
  readonly apexProxied: boolean;
  readonly wildcardProxied: boolean;
  readonly sslMode: 'full_strict';
}

export interface CloudflareDomainVerification {
  readonly domainId: string;
  readonly zoneId: string;
  readonly verified: boolean;
  readonly category:
    | 'verified'
    | 'zone_name_mismatch'
    | 'nameserver_mismatch'
    | 'route_mismatch'
    | 'ssl_not_strict'
    | 'unavailable';
}

export interface CloudflareAuthorityPort extends HealthCheckPort {
  readonly authority: 'nameservers_dns_wildcard_ssl_proxy_cdn';
  /** Verifies one Domain against its exact owning zone (no env zone scan). */
  verifyDomainZone(input: {
    domainId: string;
    normalizedHostname: string;
    cloudflareZoneId: string;
    productionTarget?: string;
  }): Promise<CloudflareDomainVerification>;
  ensureExactVerificationTxt(hostname: string, name: string, value: string): Promise<void>;
  removeExactVerificationTxt(hostname: string, name: string, value: string): Promise<void>;
  /** Idempotently ensures the social-crawler skip rule is first in the custom WAF ruleset. */
  ensureCrawlerSkipRule(cloudflareZoneId: string): Promise<void>;
  purgeExactUrls(urls: readonly string[]): Promise<void>;
  purgeHostname(hostname: string): Promise<void>;
}
