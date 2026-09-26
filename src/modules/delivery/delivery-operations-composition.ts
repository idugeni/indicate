import 'server-only';
import { DomainProvisioningService, type DomainZoneResolver } from '@/modules/delivery/domain-provisioning-service';
import { InvalidationDispatcher } from '@/modules/delivery/invalidation';
import { SocialWarmer } from '@/modules/delivery/social-warm';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { NextCacheInvalidationAdapter } from '@/modules/delivery/next-invalidation-adapter';
import { CloudflareAuthorityAdapter } from '@/integrations/cloudflare/cloudflare-authority';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDeliveryRepository } from '@/data/repos/delivery';
import { DrizzleSocialWarmLedger } from '@/data/repos/social-warm-ledger';
import { HttpsPendingHostnameProbe } from '@/core/hostname/pending-hostname-probe';
import { VercelExactDomainAdapter } from '@/integrations/vercel/exact-domain-adapter';
import { UpstashSnapshotStore } from '@/integrations/redis/upstash-snapshot-store';
import { UpstashHostnameCache } from '@/integrations/redis/upstash-hostname-cache';

/**
 * Compose delivery operations from the server runtime context.
 *
 * @remarks Tenant RLS forces the org context; the transaction sets local set_config (auto-reverts on commit) so the shared pool never leaks across tenants. Regional sites (<slug-region>.<apex>) belong to the parent domain zone: match the suffix, pick the most specific parent.
 */
export async function deliveryOperationsComposition() {
  const context = await getServerRuntimeContext();
  const config = context.config;
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleDeliveryRepository(runtime.db, config.seo.defaultAssetUrl, config.r2.publicHost);
  const cloudflare = new CloudflareAuthorityAdapter(config.cloudflare.accountId, config.cloudflare.apiToken, config.vercel.productionTarget);
  const vercel = new VercelExactDomainAdapter(config.vercel.projectId, config.vercel.teamId, config.vercel.apiToken);
  const zoneResolver: DomainZoneResolver = {
    async resolve(hostname, organizationId) {
      return runtime.client.begin(async (transaction) => {
        await transaction`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, 'system:zone-resolver', ${crypto.randomUUID()})`;
        const rows = await transaction<{ id: string; cloudflare_zone_id: string | null; normalized_hostname: string }[]>`
          SELECT id, cloudflare_zone_id, normalized_hostname FROM public.domains
          WHERE (${hostname} = normalized_hostname OR ${hostname} LIKE '%.' || normalized_hostname)
            AND status = 'active' AND cloudflare_zone_id IS NOT NULL
          ORDER BY length(normalized_hostname) DESC
          LIMIT 1
        `;
        const row = rows[0];
        if (row === undefined || row.cloudflare_zone_id === null) return null;
        return { domainId: row.id, cloudflareZoneId: row.cloudflare_zone_id, apexHostname: row.normalized_hostname };
      });
    },
  };
  const provisioning = new DomainProvisioningService(repository, cloudflare, vercel, new HttpsPendingHostnameProbe(), config.hosts.reserved, zoneResolver, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts,
    process.env.NEXT_PHASE === 'phase-production-build'
      ? undefined
      : new UpstashHostnameCache(new UpstashSnapshotStore({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })),
    process.env.NEXT_PHASE !== 'phase-production-build');
  const facebookAppToken = config.social?.facebookAppToken ?? null;
  const invalidation = new InvalidationDispatcher(repository, new NextCacheInvalidationAdapter(), cloudflare, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts,
    facebookAppToken === null || facebookAppToken.length === 0 ? null : new SocialWarmer(facebookAppToken),
    new DrizzleSocialWarmLedger(runtime.db));
  return { config, runtime, repository, provisioning, invalidation };
}
