import type { SharedResourceIdentity } from '@/domain/foundation/platform-topology';

export const SHARED_RESOURCES: readonly SharedResourceIdentity[] = Object.freeze([
  { kind: 'next_application', count: 1, tenantScoped: false },
  { kind: 'vercel_project', count: 1, tenantScoped: false },
  { kind: 'supabase_project', count: 1, tenantScoped: false },
  { kind: 'supabase_database', count: 1, tenantScoped: false },
  { kind: 'supabase_auth', count: 1, tenantScoped: false },
  { kind: 'r2_bucket', count: 1, tenantScoped: false },
  { kind: 'upstash_redis', count: 1, tenantScoped: false },
  { kind: 'public_news_template', count: 1, tenantScoped: false },
]);

export const DNS_AUTHORITY = Object.freeze({
  provider: 'cloudflare' as const,
  responsibilities: Object.freeze(['nameservers', 'dns', 'wildcard_dns', 'ssl_proxy', 'cdn'] as const),
});

export const APPLICATION_HOST = Object.freeze({
  provider: 'vercel' as const,
  projectCount: 1 as const,
  responsibility: 'application_hosting_only' as const,
  domainAssociation: 'exact_only' as const,
  nameserverTransferAllowed: false as const,
  wildcardRegistrationAllowed: false as const,
});
