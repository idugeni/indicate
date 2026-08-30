import 'server-only';
import { DomainProvisioningService } from '@/application/stage5/domain-provisioning-service';
import { InvalidationDispatcher } from '@/application/stage5/invalidation';
import { getRuntimeConfig } from '@/config/server';
import { NextCacheInvalidationAdapter } from '@/infrastructure/cache/next-cache-invalidation';
import { CloudflareAuthorityAdapter } from '@/infrastructure/cloudflare/cloudflare-authority';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleStage5Repository } from '@/infrastructure/db/repositories/drizzle-stage5-repository';
import { HttpsPendingHostnameProbe } from '@/infrastructure/http/pending-hostname-probe';
import { UpstashCacheCoordination } from '@/infrastructure/redis/upstash-cache-coordination';
import { VercelExactDomainAdapter } from '@/infrastructure/vercel/exact-domain-adapter';

export function stage5OperationsComposition() {
  const config = getRuntimeConfig();
  const runtime = createRuntimeDatabase(config);
  const repository = new DrizzleStage5Repository(runtime.db, config.seo.fallbackAssetUrl);
  const cloudflare = new CloudflareAuthorityAdapter(config.cloudflare.accountId, config.cloudflare.apiToken, config.cloudflare.zoneIds, config.cloudflare.expectedNameservers, config.vercel.productionTarget);
  const vercel = new VercelExactDomainAdapter(config.vercel.projectId, config.vercel.teamId, config.vercel.apiToken);
  const provisioning = new DomainProvisioningService(repository, cloudflare, vercel, new HttpsPendingHostnameProbe(), config.hosts.reserved, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts);
  const invalidation = new InvalidationDispatcher(repository, new NextCacheInvalidationAdapter(), new UpstashCacheCoordination(config.redis.url, config.redis.token, config.redis.namespace), cloudflare, config.publishing.retryDelaysSeconds, config.publishing.maxAttempts);
  return { config, runtime, repository, provisioning, invalidation };
}
