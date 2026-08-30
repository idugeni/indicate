export const PLATFORM_RESOURCE_KINDS = [
  'next_application',
  'vercel_project',
  'supabase_project',
  'supabase_database',
  'supabase_auth',
  'r2_bucket',
  'upstash_redis',
  'public_news_template',
] as const;

export type PlatformResourceKind = (typeof PLATFORM_RESOURCE_KINDS)[number];

export interface SharedResourceIdentity {
  readonly kind: PlatformResourceKind;
  readonly count: 1;
  readonly tenantScoped: false;
}
