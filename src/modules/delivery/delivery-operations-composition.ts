import 'server-only';
import { DomainProvisioningService, type DomainZoneResolver } from '@/modules/delivery/domain-provisioning-service';
import { InvalidationDispatcher } from '@/modules/delivery/invalidation';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { NextCacheInvalidationAdapter } from '@/modules/delivery/next-invalidation-adapter';
import { CloudflareAuthorityAdapter } from '@/integrations/cloudflare/cloudflare-authority';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzleDeliveryRepository } from '@/data/repos/delivery';
import { HttpsPendingHostnameProbe } from '@/core/hostname/pending-hostname-probe';
import { UpstashCacheCoordination } from '@/integrations/redis/upstash-cache-coordination';
import { VercelExactDomainAdapter } from '@/integrations/vercel/exact-domain-adapter';

export async function deliveryOperationsComposition() {
  const context = await getServerRuntimeContext();
  const config = context.config;
  const runtime = createRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleDeliveryRepository(runtime.db, config.seo.defaultAssetUrl);
  const cloudflare = new CloudflareAuthorityAdapter(config.cloudflare.accountId, config.cloudflare.apiToken, config.vercel.productionTarget);
  const vercel = new VercelExactDomainAdapter(config.vercel.projectId, config.vercel.teamId, config.vercel.apiToken);
  const zoneResolver: DomainZoneResolver = {
    async resolve(hostname) {
      const rows = await runtime.client<{ id: string; cloudflare_zone_id: string | null }[]>`
        SELECT id, cloudflare_zone_id FROM public.domains
        WHERE normalized_hostname = ${hostname} AND status = 'active' AND cloudflare_zone_id IS NOT NULL
        LIMIT 1
      `;
      const row = rows[0];
      if (row === undefined || row.cloudflare_zone_id === null) return null;
      return { domainId: row.id, cloudflareZoneId: row.cloudflare_zone_id };
    },
  };
  const provisioning = new DomainProvisioningService(repository, cloudflare, vercel, new HttpsPendingHostnameProbe(), config.hosts.reserved, zoneResolver, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts);
  const invalidation = new InvalidationDispatcher(repository, new NextCacheInvalidationAdapter(), new UpstashCacheCoordination(config.redis.url, config.redis.token, config.redis.namespace), cloudflare, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts);
  return { config, runtime, repository, provisioning, invalidation };
}
