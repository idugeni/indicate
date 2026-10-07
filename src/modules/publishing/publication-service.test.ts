import { describe, expect, it, vi } from 'vitest';

import { PublicationService } from '@/modules/publishing/publication-service';
import {
  PublishingAccessDeniedError,
  PublishingConflictError,
  PublishingSubscriptionInactiveError,
} from '@/modules/publishing/ports';

const actor = {
  actorType: 'api_key',
  actorId: 'key-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'api',
  requestId: 'req-1',
} as const;

const ARTICLE = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const SITE_A = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const SITE_B = '0199a2b3-4c5d-7e8f-9012-3456789abce0';
const JOB = '0199a2b3-4c5d-7e8f-9012-3456789abce1';
const LONG_DESCRIPTION = 'Deskripsi unik yang cukup panjang untuk melewati batas minimal lima puluh karakter validasi.';
const OTHER_DESCRIPTION = 'Deskripsi kedua yang juga panjang dan berbeda agar tidak terdeteksi sebagai duplikat validasi.';

const statusProjection = (jobId: string) => ({
  job: { id: jobId, state: 'queued' },
  targets: [],
  result: null,
});

const variantContext = {
  articleId: ARTICLE,
  title: 'Judul Kanonik Artikel',
  slug: 'judul-kanonik-artikel',
  body: 'Isi artikel yang cukup panjang untuk diekstrak menjadi deskripsi kanonik oleh layanan publikasi.',
  status: 'draft',
  scheduledAt: null,
  regions: [],
  variants: [],
};

function harness(overrides: {
  listPublications?: (...args: unknown[]) => Promise<unknown>;
  getArticleVariantContext?: (...args: unknown[]) => Promise<unknown>;
  acceptPublication?: (...args: unknown[]) => Promise<unknown>;
  getPublication?: (...args: unknown[]) => Promise<unknown>;
  retryTargets?: (...args: unknown[]) => Promise<unknown>;
  unpublishTargets?: (...args: unknown[]) => Promise<unknown>;
  setArticleSiteRobots?: (...args: unknown[]) => Promise<unknown>;
  schedule?: (...args: unknown[]) => Promise<unknown>;
} = {}) {
  let counter = 0;
  const repository = {
    listPublications: vi.fn(overrides.listPublications ?? (async () => [])),
    recordDenial: vi.fn(async () => undefined),
    getArticleVariantContext: vi.fn(overrides.getArticleVariantContext ?? (async () => variantContext)),
    acceptPublication: vi.fn(
      overrides.acceptPublication ??
        (async () => ({ kind: 'created', job: { id: 'job-1' } })),
    ),
    getPublication: vi.fn(overrides.getPublication ?? (async () => statusProjection('job-1'))),
    retryTargets: vi.fn(overrides.retryTargets ?? (async () => statusProjection('job-1'))),
    unpublishTargets: vi.fn(overrides.unpublishTargets ?? (async () => statusProjection('job-1'))),
    setArticleSiteRobots: vi.fn(overrides.setArticleSiteRobots ?? (async () => ({ articleSiteId: 'as-1', directive: 'noindex,nofollow', version: 2 }))),
    recordDispatchScheduled: vi.fn(async () => undefined),
    recordDispatchFailure: vi.fn(async () => undefined),
  };
  const queue = { schedule: vi.fn(overrides.schedule ?? (async () => undefined)) };
  const service = new PublicationService(
    repository as never,
    queue as never,
    { create: () => `id-${(counter += 1)}` },
    { maxAttempts: 3, delaysSeconds: [30] },
    { now: () => new Date('2026-09-18T14:00:00.000Z') },
  );
  return { repository, queue, service };
}

const singleRequest = {
  articleId: ARTICLE,
  siteIds: [SITE_A],
  idempotencyKey: 'key-1',
  options: {},
  overrides: {},
};

describe('PublicationService listJobs', () => {
  it('mengembalikan ringkasan pekerjaan terbaru', async () => {
    const rows = [{ job: { id: 'job-1' }, articleTitle: 'Judul' }];
    const repository = {
      listPublications: vi.fn(async () => rows),
      recordDenial: vi.fn(async () => undefined),
    };
    const service = new PublicationService(
      repository as never,
      { schedule: vi.fn(async () => undefined) } as never,
      { create: () => 'id-1' },
      { maxAttempts: 3, delaysSeconds: [30] },
      { now: () => new Date('2026-09-18T14:00:00.000Z') },
    );
    const result = await service.listJobs(actor);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual(rows);
    expect(repository.listPublications).toHaveBeenCalledWith(actor, 5);
  });

  it('memetakan penolakan akses ke denial non-disclosing', async () => {
    const { service, repository } = harness({
      listPublications: async () => {
        throw new PublishingAccessDeniedError();
      },
    });
    const result = await service.listJobs(actor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.recordDenial).toHaveBeenCalled();
  });

  it('memetakan kegagalan repo ke dependency unavailable', async () => {
    const repository = {
      listPublications: vi.fn(async () => {
        throw new Error('db down');
      }),
      recordDenial: vi.fn(async () => undefined),
    };
    const service = new PublicationService(
      repository as never,
      { schedule: vi.fn(async () => undefined) } as never,
      { create: () => 'id-1' },
      { maxAttempts: 3, delaysSeconds: [30] },
      { now: () => new Date('2026-09-18T14:00:00.000Z') },
    );
    const result = await service.listJobs(actor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});