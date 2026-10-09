import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveContext: vi.fn(),
  getUsableApproval: vi.fn(),
  consumeApproval: vi.fn(),
  readArticle: vi.fn(),
  updateArticle: vi.fn(),
  createArticle: vi.fn(),
}));

vi.mock('@/core/security/mutation-guard', () => ({ denyCrossSiteMutation: () => false }));
vi.mock('@/core/observability/api-access', () => ({ withApiAccess: (_name: string, handler: unknown) => handler }));
vi.mock('@/core/observability/request-id', () => ({ resolveRequestId: () => 'req-test' }));
vi.mock('@/core/observability/logger', () => ({ logEvent: vi.fn() }));
vi.mock('@/core/errors', () => ({
  createNonDisclosingDenial: () => ({ error: { code: 'FORBIDDEN', message: 'Denied' } }),
  createPublicError: (code: string, message: string) => ({ error: { code, message, error: { code, message } } }),
}));
vi.mock('@/core/config/runtime/runtime-context', () => ({ getServerRuntimeContext: vi.fn() }));
vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: vi.fn() }));
vi.mock('@/core/system/uuid-generator', () => ({ UuidGenerator: class {} }));
vi.mock('@/modules/dashboard/dashboard-dal', () => ({ fetchCachedAnalytics: vi.fn(), fetchCachedDashboard: vi.fn() }));
vi.mock('@/modules/ai-operator/tool-registry', () => ({
  getAiOperatorTool: (id: string) => ({
    id,
    scope: 'tenant',
    input: { safeParse: (data: unknown) => ({ success: true, data }) },
  }),
  authorizeAiOperatorTool: () => ({ allowed: true, requiresApproval: true, risk: 'write' }),
  isAiOperatorToolExecutable: () => true,
  listAiOperatorTools: () => [],
}));
vi.mock('@/modules/publishing/media-service', () => ({ MediaService: class {} }));
vi.mock('@/modules/publishing/publication-service', () => ({ PublicationService: class {} }));
vi.mock('@/data/repos/publishing/repository', () => ({ DrizzlePublishingRepository: class {} }));
vi.mock('@/integrations/storage/r2-object-storage', () => ({ R2ObjectStorageAdapter: class {} }));
vi.mock('@/integrations/redis/upstash-publication-queue', () => ({ UpstashPublicationQueueAdapter: class {} }));
vi.mock('@/modules/ai-operator/dashboard-context', () => ({ resolveAiOperatorDashboardContext: mocks.resolveContext }));
vi.mock('@/modules/ai-operator/approval-store', () => ({
  getUsableAiOperatorApproval: mocks.getUsableApproval,
  consumeAiOperatorApproval: mocks.consumeApproval,
}));

import { POST } from '@/app/api/dashboard/operator/route';

const organizationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const articleId = '11111111-1111-4111-8111-111111111111';
const approvalId = '22222222-2222-4222-8222-222222222222';

function article(overrides: Record<string, unknown> = {}) {
  return {
    id: articleId,
    version: 3,
    title: 'Judul lama',
    body: 'Isi lama',
    status: 'draft',
    regionId: null,
    slug: 'judul-lama',
    publisherId: null,
    categoryId: null,
    authorId: null,
    leadMediaId: null,
    coverImageUrl: null,
    excerpt: null,
    canonicalUrl: null,
    bodyJson: null,
    source: '',
    tags: [],
    scheduledAt: null,
    type: 'standard',
    isSponsored: false,
    videoUrl: null,
    audioUrl: null,
    durationSeconds: null,
    ...overrides,
  };
}

function request(input: Record<string, unknown>) {
  return new Request('http://localhost/api/dashboard/operator', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: JSON.stringify({
      organizationId,
      toolId: 'content.articles.update',
      input,
      approvalId,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveContext.mockResolvedValue({
    actor: {
      actorType: 'user',
      actorId: 'requester-1',
      organizationId,
      permissionSet: new Set(['article.manage']),
      platformPermissionSet: new Set(),
      entryPoint: 'dashboard',
      requestId: 'req-test',
    },
    db: {},
    service: {
      readArticleForEdit: mocks.readArticle,
      updateArticle: mocks.updateArticle,
      createArticleWithId: mocks.createArticle,
    },
  });
  mocks.getUsableApproval.mockResolvedValue({ ok: true, replay: false, record: { id: approvalId } });
  mocks.consumeApproval.mockResolvedValue({ ok: true, record: { id: approvalId } });
  mocks.readArticle.mockResolvedValue({ ok: true, value: { article: article() } });
  mocks.updateArticle.mockResolvedValue({ ok: true, value: article({ title: 'Judul baru', version: 4 }) });
  mocks.createArticle.mockResolvedValue({ ok: true, value: article({ id: approvalId, version: 1, title: 'Artikel baru', slug: 'artikel-baru', body: 'Isi baru' }) });
});

afterEach(() => vi.restoreAllMocks());

describe('POST /api/dashboard/operator article create approvals', () => {
  it('creates an article using the approval UUID as its deterministic article ID', async () => {
    mocks.readArticle.mockResolvedValue({ ok: false, error: { error: { code: 'FORBIDDEN', message: 'Not found' } } });
    const response = await POST(new Request('http://localhost/api/dashboard/operator', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: JSON.stringify({
        organizationId,
        toolId: 'content.articles.create',
        approvalId,
        input: { regionId: null, slug: 'artikel-baru', title: 'Artikel baru', body: 'Isi baru', status: 'draft' },
      }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.readArticle).toHaveBeenCalledWith(expect.anything(), { id: approvalId, ownerOrganizationId: organizationId });
    expect(mocks.createArticle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ slug: 'artikel-baru', title: 'Artikel baru', body: 'Isi baru', status: 'draft' }), approvalId);
    expect(mocks.consumeApproval).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ toolId: 'content.articles.create', result: { replayed: false } });
  });

  it('replays an existing deterministic article instead of creating a duplicate', async () => {
    mocks.getUsableApproval.mockResolvedValue({ ok: true, replay: true, record: { id: approvalId } });
    mocks.readArticle.mockResolvedValue({ ok: true, value: { article: article({ id: approvalId, version: 1, title: 'Artikel baru', slug: 'artikel-baru', body: 'Isi baru', status: 'draft' }) } });
    const response = await POST(new Request('http://localhost/api/dashboard/operator', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: JSON.stringify({ organizationId, toolId: 'content.articles.create', approvalId, input: { regionId: null, slug: 'artikel-baru', title: 'Artikel baru', body: 'Isi baru', status: 'draft' } }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.createArticle).not.toHaveBeenCalled();
    expect(mocks.consumeApproval).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ result: { replayed: true, version: 1 } });
  });
});

describe('POST /api/dashboard/operator article update approvals', () => {
  it('updates only the approved tenant article with an optimistic version and consumes approval', async () => {
    const response = await POST(request({
      articleId,
      expectedVersion: 3,
      title: 'Judul baru',
    }));
    expect(response.status).toBe(200);
    expect(mocks.readArticle).toHaveBeenCalledWith(expect.anything(), { id: articleId, ownerOrganizationId: organizationId });
    expect(mocks.updateArticle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      id: articleId,
      expectedVersion: 3,
      title: 'Judul baru',
      body: 'Isi lama',
      slug: 'judul-lama',
      status: 'draft',
    }));
    expect(mocks.consumeApproval).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ toolId: 'content.articles.update', result: { replayed: false } });
  });

  it('does not repeat a write when the exact approved update already committed', async () => {
    mocks.readArticle.mockResolvedValue({ ok: true, value: { article: article({ version: 4, title: 'Judul baru' }) } });
    const response = await POST(request({ articleId, expectedVersion: 3, title: 'Judul baru' }));
    expect(response.status).toBe(200);
    expect(mocks.updateArticle).not.toHaveBeenCalled();
    expect(mocks.consumeApproval).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ result: { replayed: true, version: 4 } });
  });

  it('rejects stale versions when the current article does not match the approved state', async () => {
    mocks.readArticle.mockResolvedValue({ ok: true, value: { article: article({ version: 5, title: 'Perubahan orang lain' }) } });
    const response = await POST(request({ articleId, expectedVersion: 3, title: 'Judul baru' }));
    expect(response.status).toBe(409);
    expect(mocks.updateArticle).not.toHaveBeenCalled();
    expect(mocks.consumeApproval).not.toHaveBeenCalled();
  });

  it('rejects a mismatched or unapproved command before reading or mutating the article', async () => {
    mocks.getUsableApproval.mockResolvedValue({ ok: false, reason: 'COMMAND_MISMATCH' });
    const response = await POST(request({ articleId, expectedVersion: 3, title: 'Judul baru' }));
    expect(response.status).toBe(409);
    expect(mocks.readArticle).not.toHaveBeenCalled();
    expect(mocks.updateArticle).not.toHaveBeenCalled();
    expect(mocks.consumeApproval).not.toHaveBeenCalled();
  });

  it('requires an approval ID before any article update is attempted', async () => {
    const response = await POST(new Request('http://localhost/api/dashboard/operator', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: JSON.stringify({ organizationId, toolId: 'content.articles.update', input: { articleId, expectedVersion: 3, title: 'Judul baru' } }),
    }));
    expect(response.status).toBe(409);
    expect(mocks.readArticle).not.toHaveBeenCalled();
    expect(mocks.updateArticle).not.toHaveBeenCalled();
  });

  it('does not edit archived articles', async () => {
    mocks.readArticle.mockResolvedValue({ ok: true, value: { article: article({ status: 'archived' }) } });
    const response = await POST(request({ articleId, expectedVersion: 3, title: 'Judul baru' }));
    expect(response.status).toBe(409);
    expect(mocks.updateArticle).not.toHaveBeenCalled();
    expect(mocks.consumeApproval).not.toHaveBeenCalled();
  });
});
