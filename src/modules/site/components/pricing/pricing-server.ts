import { cacheLife, cacheTag } from 'next/cache';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { FALLBACK_PACKAGES, type PricingPackage } from '@/modules/site/components/pricing/pricing-cards';

/** Single package source for public surfaces; DB when reachable, static fallback otherwise. Hasil di-cache per jam agar prerender tidak membuka DB tiap build. */
export async function loadPricingPackages(): Promise<readonly PricingPackage[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  try {
    const context = await getServerRuntimeContext();
    const runtime = createRuntimeDatabase(context.bootstrap);
    try {
      const rows = await new DrizzleBillingRepository(runtime.db).listPackages();
      if (rows.length > 0) return rows;
    } finally {
      await runtime.close();
    }
  } catch {
    return FALLBACK_PACKAGES;
  }
  return FALLBACK_PACKAGES;
}
