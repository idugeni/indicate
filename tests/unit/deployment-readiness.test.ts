import { describe, expect, it } from 'vitest';

import { validateDeploymentReadiness } from '@/application/deployment/validate-readiness';
import type { DeploymentReadinessPort, SharedResourceHealthSnapshot } from '@/ports/deployment-readiness';

const healthySnapshot: SharedResourceHealthSnapshot = {
  identities: {
    supabaseAuthProjectRef: 'project-one',
    supabaseDatabaseProjectRef: 'project-one',
    r2BucketName: 'shared-bucket',
    upstashResourceId: 'redis-one',
    vercelProjectId: 'vercel-one',
  },
  services: {
    supabaseAuth: 'healthy',
    supabaseDatabase: 'healthy',
    r2: 'healthy',
    upstash: 'healthy',
    cloudflare: 'healthy',
    vercel: 'healthy',
  },
};
const expected = {
  supabaseProjectRef: 'project-one',
  r2BucketName: 'shared-bucket',
  upstashResourceId: 'redis-one',
  vercelProjectId: 'vercel-one',
};

function port(snapshot: SharedResourceHealthSnapshot): DeploymentReadinessPort {
  return { inspect: async () => snapshot };
}

describe('deployment readiness', () => {
  it('accepts one healthy coherent shared resource topology', async () => {
    await expect(validateDeploymentReadiness(port(healthySnapshot), expected)).resolves.toEqual({ ok: true, value: 'ready' });
  });

  it('returns sanitized categories for unhealthy or divergent singleton resources', async () => {
    const snapshot: SharedResourceHealthSnapshot = {
      identities: {
        ...healthySnapshot.identities,
        supabaseDatabaseProjectRef: 'another-project',
        r2BucketName: 'tenant-bucket',
      },
      services: { ...healthySnapshot.services, upstash: 'unhealthy' },
    };
    const result = await validateDeploymentReadiness(port(snapshot), expected);
    expect(result).toEqual({
      ok: false,
      error: ['R2_IDENTITY_MISMATCH', 'SERVICE_UNHEALTHY', 'SUPABASE_IDENTITY_MISMATCH'],
    });
    expect(JSON.stringify(result)).not.toContain('another-project');
    expect(JSON.stringify(result)).not.toContain('tenant-bucket');
  });
});
