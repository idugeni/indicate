import 'server-only';
import { DomainProvisioningService, type DomainZoneResolver } from '@/modules/delivery/domain-provisioning-service';
import { InvalidationDispatcher } from '@/modules/delivery/invalidation';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { NextCacheInvalidationAdapter } from '@/modules/delivery/next-invalidation-adapter';
import { CloudflareAuthorityAdapter } from '@/integrations/cloudflare/cloudflare-authority';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDeliveryRepository } from '@/data/repos/delivery';
import { HttpsPendingHostnameProbe } from '@/core/hostname/pending-hostname-probe';
import { VercelExactDomainAdapter } from '@/integrations/vercel/exact-domain-adapter';

/**
 * Compose delivery operations from the server runtime context.
 *
 * @remarks RLS tenant memaksa konteks org; transaksi membuat set_config lokal (auto-revert saat commit) sehingga pool bersama tidak bocor antar-tenant. Site regional (<slug-region>.<apex>) dimiliki zone domain induk: cocokkan sufiks, pilih induk paling spesifik.
 */
export async function deliveryOperationsComposition() {
  const context = await getServerRuntimeContext();
  const config = context.config;
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleDeliveryRepository(runtime.db, config.seo.defaultAssetUrl);
  const cloudflare = new CloudflareAuthorityAdapter(config.cloudflare.accountId, config.cloudflare.apiToken, config.vercel.productionTarget);
  const vercel = new VercelExactDomainAdapter(config.vercel.projectId, config.vercel.teamId, config.vercel.apiToken);
  const zoneResolver: DomainZoneResolver = {
    async resolve(hostname, organizationId) {
      return runtime.client.begin(async (transaction) => {
        await transaction`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, 'system:zone-resolver', ${crypto.randomUUID()})`;
        const rows = await transaction<{ id: string; cloudflare_zone_id: string | null }[]>`
          SELECT id, cloudflare_zone_id FROM public.domains
          WHERE (${hostname} = normalized_hostname OR ${hostname} LIKE '%.' || normalized_hostname)
            AND status = 'active' AND cloudflare_zone_id IS NOT NULL
          ORDER BY length(normalized_hostname) DESC
          LIMIT 1
        `;
        const row = rows[0];
        if (row === undefined || row.cloudflare_zone_id === null) return null;
        return { domainId: row.id, cloudflareZoneId: row.cloudflare_zone_id };
      });
    },
  };
  const provisioning = new DomainProvisioningService(repository, cloudflare, vercel, new HttpsPendingHostnameProbe(), config.hosts.reserved, zoneResolver, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts);
  const invalidation = new InvalidationDispatcher(repository, new NextCacheInvalidationAdapter(), cloudflare, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts);
  return { config, runtime, repository, provisioning, invalidation };
}
