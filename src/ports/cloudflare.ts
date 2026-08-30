import type { HealthCheckPort } from '@/ports/health-check';

export interface CloudflareZoneStatus {
  readonly hostname: string;
  readonly nameserversAuthoritative: boolean;
  readonly apexProxied: boolean;
  readonly wildcardProxied: boolean;
  readonly sslMode: 'full_strict';
}

export interface CloudflareAuthorityPort extends HealthCheckPort {
  readonly authority: 'nameservers_dns_wildcard_ssl_proxy_cdn';
  verifyZone(hostname: string): Promise<CloudflareZoneStatus>;
  ensureExactVerificationTxt(hostname: string, name: string, value: string): Promise<void>;
  removeExactVerificationTxt(hostname: string, name: string, value: string): Promise<void>;
  purgeExactUrls(urls: readonly string[]): Promise<void>;
  purgeHostname(hostname: string): Promise<void>;
}
