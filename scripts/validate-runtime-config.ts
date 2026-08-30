import { validateRuntimeConfig } from '../src/config/schema';

const result = validateRuntimeConfig(process.env);
if (!result.success) {
  console.error(JSON.stringify({ status: 'invalid', issues: result.issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'valid',
  environment: result.config.environment,
  rootHostCount: result.config.hosts.mvpRoots.length,
  controlPlaneHostCount: result.config.hosts.reserved.size,
  topology: {
    supabaseProjects: 1,
    r2Buckets: 1,
    redisResources: 1,
    vercelProjects: 1,
  },
}, null, 2));
