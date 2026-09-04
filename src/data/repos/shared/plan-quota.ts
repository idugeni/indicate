import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { planQuotas, subscriptions } from '@/data/schema';
import type * as schema from '@/data/schema';
import type { PlanQuota } from '@/modules/billing/quota';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Plan-quota source of truth; null when no subscription/quota row (never blocks). */
export async function readPlanQuota(transaction: Transaction, organizationId: string): Promise<PlanQuota | null> {
  const subscription = await transaction.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.organizationId, organizationId)).limit(1);
  const plan = subscription[0]?.plan;
  if (plan === undefined) return null;
  const quotaRows = await transaction.select().from(planQuotas).where(eq(planQuotas.plan, plan)).limit(1);
  const quotaRow = quotaRows[0];
  if (quotaRow === undefined) return null;
  return Object.freeze({
    plan,
    maxDomains: quotaRow.maxDomains,
    maxSites: quotaRow.maxSites,
    maxMembers: quotaRow.maxMembers,
    maxApiKeys: quotaRow.maxApiKeys,
  });
}
