import 'server-only';
import { HostnameResolver } from '@/application/stage5/hostname-resolver';
import { PublicContentService } from '@/application/stage5/public-content-service';
import { getRuntimeConfig } from '@/config/server';
import { NextPublicSiteCache } from '@/infrastructure/cache/next-public-site-cache';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleStage5Repository } from '@/infrastructure/db/repositories/drizzle-stage5-repository';
import { createStage5E2eRepository } from '@/infrastructure/testing/stage5-fixture';
import type { Stage5Repository } from '@/ports/stage5-repository';

declare global { var __indicateStage5Repository: Stage5Repository | undefined; }
function repository(): Stage5Repository {
  if (globalThis.__indicateStage5Repository !== undefined) return globalThis.__indicateStage5Repository;
  const config = getRuntimeConfig();
  if (process.env.STAGE2_E2E_MODE === '1' && process.env.APP_ENVIRONMENT === 'test') globalThis.__indicateStage5Repository = createStage5E2eRepository(config);
  else globalThis.__indicateStage5Repository = new DrizzleStage5Repository(createRuntimeDatabase(config).db, config.seo.fallbackAssetUrl);
  return globalThis.__indicateStage5Repository;
}
export function stage5Composition() {
  const config = getRuntimeConfig(); const repo = repository();
  return { resolver: new HostnameResolver(repo, config.hosts), content: new PublicContentService(repo, new NextPublicSiteCache(config.cache.defaultTtlSeconds)), repository: repo, config };
}
