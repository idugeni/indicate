import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardUser } from '@/modules/auth/authenticate-dashboard';
import { DASHBOARD_ACCESS_KEY_COOKIE } from '@/modules/auth/dashboard-access-keys/cookie';
import { GET as avatarGET } from '@/app/api/dashboard/avatar/route';
import { GET as billingGET } from '@/app/api/dashboard/billing/route';
import { GET as invoiceGET } from '@/app/api/dashboard/billing/invoice/[id]/route';
import { GET as sealGET } from '@/app/api/dashboard/billing/invoice/[id]/seal/route';
import { GET as contentGET, POST as contentPOST } from '@/app/api/dashboard/content/route';
import { POST as deliveryPOST } from '@/app/api/dashboard/delivery/route';
import { GET as integrationsGET } from '@/app/api/dashboard/integrations/route';
import { GET as moderationGET } from '@/app/api/dashboard/moderation/route';
import { GET as profileGET, POST as profilePOST } from '@/app/api/dashboard/profile/route';
import { GET as publishingGET, POST as publishingPOST } from '@/app/api/dashboard/publishing/route';
import { GET as runtimeConfigGET } from '@/app/api/dashboard/runtime-config/route';
import { GET as workspaceGET, POST as workspacePOST } from '@/app/api/dashboard/workspace/route';
import {
  authenticateDashboardUser,
  authorizeDashboardOrganization,
  authorizeDashboardPlatform,
} from '@/modules/auth/authenticate-dashboard';

const shared = vi.hoisted(() => ({
  loggedIn: true,
  bearer: 'proof-bearer-token',
  orgId: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0',
  userId: '11111111-1111-4111-8111-111111111111',
  authUserId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
  rowId: '44444444-4444-4444-8444-444444444444',
  invoice: {
    id: 'inv-1',
    organizationId: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0',
    organizationName: 'Proof Org',
    number: 'INV-001',
    amountIdr: 150000,
    currency: 'IDR',
    status: 'paid',
    paidAt: '2026-09-20T10:00:00.000Z',
    dueAt: null,
    billingNote: null,
    paymentMethod: 'Transfer',
    voidedAt: null,
    voidReason: null,
    version: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
  },
}));

function proofUser(): DashboardUser {
  return {
    authUserId: shared.authUserId,
    localUserId: shared.userId,
    avatarUrl: null,
    accessKey: null,
  };
}

function proofActor(organizationId: string) {
  return {
    actorType: 'user' as const,
    actorId: shared.userId,
    verifiedAuthUserId: shared.authUserId,
    organizationId,
    permissionSet: new Set(['sites.manage']),
    platformPermissionSet: new Set(['platform.customer.admin']),
    regionScopeId: null,
    entryPoint: 'dashboard' as const,
    requestId: 'proof',
  };
}

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      shared.loggedIn && name === DASHBOARD_ACCESS_KEY_COOKIE ? { value: shared.bearer } : undefined,
    getAll: () =>
      shared.loggedIn ? [{ name: DASHBOARD_ACCESS_KEY_COOKIE, value: shared.bearer }] : [],
    set: () => {},
  }),
}));

vi.mock('@/modules/auth/authenticate-dashboard', () => ({
  authenticateDashboardUser: async () => (shared.loggedIn ? proofUser() : null),
  authorizeDashboardOrganization: async (_db: unknown, _user: unknown, organizationId: string) =>
    shared.loggedIn ? proofActor(organizationId) : null,
  authorizeDashboardPlatform: async () =>
    shared.loggedIn
      ? { ...proofActor(shared.orgId), organizationId: null, permissionSet: new Set<string>() }
      : null,
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({
    bootstrap: {},
    config: {
      r2: {
        accountId: 'proof',
        bucketName: 'proof',
        publicBucketName: 'proof-public',
        accessKeyId: 'proof',
        secretAccessKey: 'proof',
        maxBytes: 1000000,
        allowedTypes: ['image/webp'],
        uploadTtlSeconds: 60,
        readTtlSeconds: 60,
      },
      redis: { url: 'https://proof-redis', token: 'proof', namespace: 'proof', resourceId: 'proof' },
      publishing: { maxAttempts: 3, retryDelaysSeconds: [60] },
      email: null,
      rateLimits: { mutation: { allowance: 10, windowSeconds: 60 } },
    },
  }),
  invalidateServerRuntimeConfig: async () => {},
}));

vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: () => ({ db: {} }) }));

vi.mock('@/modules/publishing/media-service', () => ({
  MediaService: class {
    reserveUpload = async () => ({
      ok: true,
      value: {
        key: 'proof-key',
        url: 'https://upload.example/proof',
        expiresAt: new Date().toISOString(),
        requiredHeaders: {},
      },
    });
    list = async () => ({ ok: true, value: [] });
  },
}));

vi.mock('@/modules/publishing/publication-service', () => ({
  PublicationService: class {
    constructor(..._args: unknown[]) {}
  },
}));

vi.mock('@/integrations/redis/upstash-publication-queue', async () => {
  const actual = (await vi.importActual('@/integrations/redis/upstash-publication-queue')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    UpstashPublicationQueueAdapter: class {
      constructor(..._args: unknown[]) {}
    },
  };
});

vi.mock('@/integrations/storage/r2-object-storage', async () => {
  const actual = (await vi.importActual('@/integrations/storage/r2-object-storage')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    R2ObjectStorageAdapter: class {
      authorizeExactPut = async () => ({
        url: 'https://put.example/proof',
        expiresAt: new Date(),
        requiredHeaders: {},
      });
      authorizeExactGet = async () => ({ url: 'https://get.example/proof' });
      headExact = async () => null;
      getExact = async () => ({ body: new Uint8Array([1, 2, 3]), contentType: 'image/png' });
    },
  };
});

vi.mock('@/data/repos/publishing/repository', async () => {
  const actual = (await vi.importActual('@/data/repos/publishing/repository')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    DrizzlePublishingRepository: class {
      snapshot = async () => ({ articles: [], sites: [], domains: [], articleSites: [] });
      mediaOwnerCounts = async () => [];
    },
  };
});

vi.mock('@/modules/delivery', () => ({
  deliveryOperationsComposition: async () => ({
    runtime: { db: {} },
    provisioning: {
      activate: async () => ({ accepted: true }),
      deactivate: async () => ({ accepted: true }),
    },
  }),
}));

vi.mock('@/modules/ai/ai-embeddings', () => ({
  reindexArticleEmbeddings: async () => ({ ok: true, chunks: 0, embedded: 0 }),
}));

vi.mock('@/data/repos/content/admin', async () => {
  const actual = (await vi.importActual('@/data/repos/content/admin')) as Record<string, unknown>;
  return {
    ...actual,
    DrizzleContentAdminRepository: class {
      listContent = async () => [];
      saveTestimonial = async () => {};
      saveFaq = async () => {};
      saveShowcaseEntry = async () => {};
      saveChannel = async () => {};
      saveTemplatePreset = async () => {};
      deleteContentRow = async () => {};
    },
  };
});

vi.mock('@/modules/billing/billing-service', async () => {
  const actual = (await vi.importActual('@/modules/billing/billing-service')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    BillingService: class {
      subscriptionState = async () => ({ ok: true, value: { state: 'active' } });
      listInvoices = async () => ({ ok: true, value: [] });
      invoiceDetail = async () => ({ ok: true, value: shared.invoice });
    },
  };
});

vi.mock('@/modules/moderation/moderation-service', async () => {
  const actual = (await vi.importActual('@/modules/moderation/moderation-service')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    ModerationService: class {
      listReports = async () => ({ ok: true, value: [] });
    },
  };
});

vi.mock('@/data/repos/tenancy/authorization', async () => {
  const actual = (await vi.importActual('@/data/repos/tenancy/authorization')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    DrizzleAuthorizationRepository: class {
      getOwnProfile = async () => ({
        displayName: 'Proof',
        bio: null,
        locale: null,
        timezone: null,
        avatarUrl: null,
      });
      updateOwnProfile = async () => ({ avatarUrl: null });
    },
  };
});

vi.mock('@/data/repos/runtime-config/admin', async () => {
  const actual = (await vi.importActual('@/data/repos/runtime-config/admin')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    DrizzleRuntimeConfigAdminRepository: class {
      readMediaPolicy = async () => ({ version: 1 });
      readPoliciesOverview = async () => [];
    },
  };
});

vi.mock('@/modules/integrations/customer-service', async () => {
  const actual = (await vi.importActual('@/modules/integrations/customer-service')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    CustomerService: class {
      read = async () => ({
        ok: true,
        value: { customer: { id: shared.orgId }, subscription: null },
      });
    },
  };
});

vi.mock('@/modules/dashboard/tenant-business-service', () => ({
  TenantBusinessService: class {
    createArticle = async () => ({ ok: true, value: {} });
    listEditorial = async () => ({
      ok: true,
      value: { articles: [], articlesNextCursor: null, total: 0, tagOptions: [] },
    });
  },
}));

vi.mock('@/modules/dashboard/dashboard-dal', () => ({
  fetchCachedDashboard: async () => ({ ok: true, value: {} }),
  fetchCachedAnalytics: async () => ({ ok: true, value: {} }),
  NextDashboardCacheInvalidator: class {},
}));

function keyScenario(loggedIn: boolean): void {
  shared.loggedIn = loggedIn;
}

type GateDb = Parameters<typeof authenticateDashboardUser>[0];
type GateStore = Parameters<typeof authenticateDashboardUser>[1];

function dashboardRequest(
  path: string,
  init?: { readonly method?: string; readonly body?: unknown; readonly loggedIn?: boolean },
): Request {
  keyScenario(init?.loggedIn === true);
  const headers: Record<string, string> = { host: 'localhost' };
  if (init?.loggedIn === true) headers.cookie = `${DASHBOARD_ACCESS_KEY_COOKIE}=${shared.bearer}`;
  if (init?.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

describe('satu pintu login untuk semua aksi admin dashboard', () => {
  beforeEach(() => {
    keyScenario(true);
  });

  it('setiap route dashboard lewat satu pintu dan tanpa cabang auth sendiri', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const base = join(process.cwd(), 'src', 'app', 'api', 'dashboard');
    const routes = [
      'workspace/route.ts',
      'delivery/route.ts',
      'avatar/route.ts',
      'profile/route.ts',
      'runtime-config/route.ts',
      'content/route.ts',
      'ai/route.ts',
      'moderation/route.ts',
      'publishing/route.ts',
      'billing/route.ts',
      'integrations/route.ts',
      'billing/invoice/[id]/route.ts',
      'billing/invoice/[id]/seal/route.ts',
    ];
    expect(routes).toHaveLength(13);
    for (const route of routes) {
      const file = join(base, route);
      expect(existsSync(file)).toBe(true);
      const source = readFileSync(file, 'utf8');
      expect(source.includes('authenticate-dashboard')).toBe(true);
      expect(source.includes('verifyCookieSession')).toBe(false);
      expect(source.includes('resolveAccessKeyActor')).toBe(false);
    }
  });

  it('pintu mengenali kedua kondisi login', async () => {
    const user = (await authenticateDashboardUser(
      {} as unknown as GateDb,
      {} as unknown as GateStore,
      'req-1',
    )) as DashboardUser | null;
    expect(user?.localUserId).toBe(shared.userId);
    expect(
      await authorizeDashboardOrganization(
        {} as unknown as GateDb,
        user as DashboardUser,
        shared.orgId,
        'req-1',
      ),
    ).not.toBeNull();
    expect(
      await authorizeDashboardPlatform({} as unknown as GateDb, user as DashboardUser, 'req-1'),
    ).not.toBeNull();
  });

  it('publishing media.reserve lolos dengan satu pintu', async () => {
    const response = await publishingPOST(
      dashboardRequest('/api/dashboard/publishing', {
        method: 'POST',
        loggedIn: true,
        body: {
          organizationId: shared.orgId,
          action: 'media.reserve',
          payload: {
            filename: 'cover.webp',
            mediaType: 'image/webp',
            sizeBytes: 41352,
            checksum: 'k95/HDveXEADOTg36te8xl+Qg9Jd4mbsx10FZtT6aTo=',
            purpose: 'article-cover',
            owner: { kind: 'organization' },
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { readonly url?: string };
    expect(body.url).toBe('https://upload.example/proof');
  });

  it('publishing media.reserve ditolak tanpa kredensial', async () => {
    const response = await publishingPOST(
      dashboardRequest('/api/dashboard/publishing', {
        method: 'POST',
        body: { organizationId: shared.orgId, action: 'media.reserve', payload: {} },
      }),
    );
    expect(response.status).toBe(401);
  });

  it('publishing membaca media dengan satu pintu', async () => {
    const response = await publishingGET(
      dashboardRequest(`/api/dashboard/publishing?organizationId=${shared.orgId}&view=media`, {
        loggedIn: true,
      }),
    );
    expect(response.status).toBe(200);
  });

  it('workspace editorial tulis dan baca dengan satu pintu', async () => {
    const created = await workspacePOST(
      dashboardRequest('/api/dashboard/workspace', {
        method: 'POST',
        loggedIn: true,
        body: { organizationId: shared.orgId, action: 'article.create', payload: {} },
      }),
    );
    expect(created.status).toBe(200);
    const listed = await workspaceGET(
      dashboardRequest(`/api/dashboard/workspace?organizationId=${shared.orgId}&view=editorial`, {
        loggedIn: true,
      }),
    );
    expect(listed.status).toBe(200);
  });

  it('workspace menolak tanpa kredensial', async () => {
    const response = await workspacePOST(
      dashboardRequest('/api/dashboard/workspace', {
        method: 'POST',
        body: { organizationId: shared.orgId, action: 'article.create', payload: {} },
      }),
    );
    expect(response.status).toBe(404);
  });

  it('delivery aktivasi domain dengan satu pintu', async () => {
    const response = await deliveryPOST(
      dashboardRequest('/api/dashboard/delivery', {
        method: 'POST',
        loggedIn: true,
        body: {
          organizationId: shared.orgId,
          siteId: shared.siteId,
          action: 'activate',
          hostname: 'proof.example',
          previousHostname: null,
        },
      }),
    );
    expect(response.status).toBe(200);
  });

  it('delivery menolak tanpa kredensial', async () => {
    const response = await deliveryPOST(
      dashboardRequest('/api/dashboard/delivery', {
        method: 'POST',
        body: {
          organizationId: shared.orgId,
          siteId: shared.siteId,
          action: 'activate',
          hostname: 'proof.example',
          previousHostname: null,
        },
      }),
    );
    expect(response.status).toBe(404);
  });

  it('content simpan dan baca dengan satu pintu', async () => {
    const saved = await contentPOST(
      dashboardRequest('/api/dashboard/content', {
        method: 'POST',
        loggedIn: true,
        body: {
          action: 'testimonial.save',
          row: {
            id: shared.rowId,
            quote: 'Cepat dan stabil.',
            author: 'Redaksi',
            role: 'Editor',
            media: 'Cetak',
            sortOrder: 1,
            active: true,
          },
        },
      }),
    );
    expect(saved.status).toBe(200);
    keyScenario(true);
    const listed = await contentGET();
    expect(listed.status).toBe(200);
  });

  it('content menolak tanpa kredensial', async () => {
    keyScenario(false);
    const response = await contentGET();
    expect(response.status).toBe(404);
  });

  it('billing membaca status langganan dengan satu pintu', async () => {
    const response = await billingGET(
      dashboardRequest(
        `/api/dashboard/billing?scope=subscription-state&organizationId=${shared.orgId}`,
        { loggedIn: true },
      ),
    );
    expect(response.status).toBe(200);
  });

  it('billing menolak tanpa kredensial', async () => {
    const response = await billingGET(
      dashboardRequest(
        `/api/dashboard/billing?scope=subscription-state&organizationId=${shared.orgId}`,
      ),
    );
    expect(response.status).toBe(404);
  });

  it('faktur dan stempel terbaca dengan satu pintu', async () => {
    const invoice = await invoiceGET(
      dashboardRequest(`/api/dashboard/billing/invoice/inv-1?organizationId=${shared.orgId}`, {
        loggedIn: true,
      }),
      { params: Promise.resolve({ id: 'inv-1' }) },
    );
    expect(invoice.status).toBe(200);
    expect(invoice.headers.get('content-type')).toContain('text/html');
    expect(await invoice.text()).toContain('INV-001');
    const seal = await sealGET(
      dashboardRequest(
        `/api/dashboard/billing/invoice/inv-1/seal?type=sign&organizationId=${shared.orgId}`,
        { loggedIn: true },
      ),
      { params: Promise.resolve({ id: 'inv-1' }) },
    );
    expect(seal.status).toBe(200);
    expect(seal.headers.get('content-type')).toBe('image/png');
  });

  it('faktur menolak tanpa kredensial', async () => {
    const response = await invoiceGET(
      dashboardRequest(`/api/dashboard/billing/invoice/inv-1?organizationId=${shared.orgId}`),
      { params: Promise.resolve({ id: 'inv-1' }) },
    );
    expect(response.status).toBe(404);
  });

  it('moderasi membaca laporan dengan satu pintu', async () => {
    const response = await moderationGET(
      dashboardRequest('/api/dashboard/moderation?scope=reports', { loggedIn: true }),
    );
    expect(response.status).toBe(200);
  });

  it('moderasi menolak tanpa kredensial', async () => {
    const response = await moderationGET(
      dashboardRequest('/api/dashboard/moderation?scope=reports'),
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('profil baca dan simpan dengan satu pintu', async () => {
    keyScenario(true);
    const read = await profileGET();
    expect(read.status).toBe(200);
    const saved = await profilePOST(
      dashboardRequest('/api/dashboard/profile', {
        method: 'POST',
        loggedIn: true,
        body: {
          action: 'save-profile',
          bio: null,
          locale: null,
          timezone: null,
          avatar: { kind: 'keep' },
        },
      }),
    );
    expect(saved.status).toBe(200);
  });

  it('profil menolak tanpa kredensial', async () => {
    keyScenario(false);
    const response = await profileGET();
    expect(response.status).toBe(404);
  });

  it('avatar terotorisasi dengan satu pintu', async () => {
    const response = await avatarGET(
      dashboardRequest('/api/dashboard/avatar?ref=r2:avatars/proof', { loggedIn: true }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { readonly url?: string };
    expect(body.url).toBe('https://get.example/proof');
  });

  it('avatar menolak tanpa kredensial', async () => {
    const response = await avatarGET(
      dashboardRequest('/api/dashboard/avatar?ref=r2:avatars/proof'),
    );
    expect(response.status).toBe(404);
  });

  it('runtime-config terbaca dengan satu pintu', async () => {
    keyScenario(true);
    const response = await runtimeConfigGET();
    expect(response.status).toBe(200);
  });

  it('runtime-config menolak tanpa kredensial', async () => {
    keyScenario(false);
    const response = await runtimeConfigGET();
    expect(response.status).toBe(404);
  });

  it('integrasi pelanggan terbaca dengan satu pintu', async () => {
    const response = await integrationsGET(
      dashboardRequest(
        `/api/dashboard/integrations?organizationId=${shared.orgId}&view=customers&customerId=${shared.orgId}`,
        { loggedIn: true },
      ),
    );
    expect(response.status).toBe(200);
  });

  it('integrasi menolak tanpa kredensial', async () => {
    const response = await integrationsGET(
      dashboardRequest(
        `/api/dashboard/integrations?organizationId=${shared.orgId}&view=customers&customerId=${shared.orgId}`,
      ),
    );
    expect(response.status).toBe(404);
  });
});
