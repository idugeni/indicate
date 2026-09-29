import { beforeEach, describe, expect, it, vi } from 'vitest';

const audit = { current: { bucketName: 'indicate-audit-worm' } as { bucketName: string } | null };
const publicBucket = { current: 'indicate-media-public' as string | null };

vi.mock('next/server', () => ({
  connection: async () => {},
  NextResponse: { json: (body: unknown) => Response.json(body) },
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({
    bootstrap: { environment: 'production' },
    snapshot: { configurationVersion: 3 },
    config: { r2: { audit: audit.current, publicBucketName: publicBucket.current } },
  }),
}));

vi.mock('@/core/observability/api-access', () => ({
  withApiAccess: (_operation: string, handler: () => Promise<Response>) => handler,
}));

async function healthBody(): Promise<Record<string, unknown>> {
  const { GET } = await import('@/app/api/health/route');
  const response = await GET(new Request('https://indicate.website/api/health'));
  return (await response.json()) as Record<string, unknown>;
}

describe('GET /api/health', () => {
  beforeEach(() => {
    audit.current = { bucketName: 'indicate-audit-worm' };
    publicBucket.current = 'indicate-media-public';
  });

  it('melaporkan ekspor audit terkonfigurasi', async () => {
    expect((await healthBody()).auditExport).toBe('configured');
  });

  it('melaporkan versi konfigurasi dari snapshot postgres', async () => {
    const body = await healthBody();
    expect(body.configurationVersion).toBe(3);
    expect(body.configurationSource).toBe('postgres');
  });

  it('menyatakan ekspor audit tidak terkonfigurasi saat bucket kosong', async () => {
    audit.current = null;
    expect((await healthBody()).auditExport).toBe('unconfigured');
  });

  it('melaporkan bucket media publik terkonfigurasi', async () => {
    expect((await healthBody()).publicMediaBucket).toBe('configured');
  });

  it('menyatakan bucket media publik tidak terkonfigurasi', async () => {
    publicBucket.current = null;
    expect((await healthBody()).publicMediaBucket).toBe('unconfigured');
  });
});
