import type { SubscriptionPlan } from '@/modules/integrations/models';

export type QuotaResource = 'domain' | 'site' | 'member' | 'api_key';

export interface PlanQuota {
  readonly plan: SubscriptionPlan;
  readonly maxDomains: number | null;
  readonly maxSites: number | null;
  readonly maxMembers: number | null;
  readonly maxApiKeys: number | null;
}

export function quotaLimitFor(quota: PlanQuota, resource: QuotaResource): number | null {
  switch (resource) {
    case 'domain': return quota.maxDomains;
    case 'site': return quota.maxSites;
    case 'member': return quota.maxMembers;
    case 'api_key': return quota.maxApiKeys;
  }
}

/** Null quota row or null limit never blocks (unlimited tier / org without subscription yet). */
export function quotaExceeded(quota: PlanQuota | null, resource: QuotaResource, current: number, added: number): { readonly exceeded: boolean; readonly limit: number | null } {
  if (quota === null || added <= 0) return Object.freeze({ exceeded: false, limit: null });
  const limit = quotaLimitFor(quota, resource);
  if (limit === null) return Object.freeze({ exceeded: false, limit: null });
  return Object.freeze({ exceeded: current + added > limit, limit });
}
