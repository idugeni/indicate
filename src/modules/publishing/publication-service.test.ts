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

describe('PublicationService setSiteRobots', () => {
  const ARTICLE_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abce2';

  it('memetakan noindex ke enum penyimpanan dan mengembalikan versi', async () => {
    const { service, repository } = harness();
    const result = await service.setSiteRobots(actor, { articleSiteId: ARTICLE_SITE, directive: 'noindex' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual({ articleSiteId: 'as-1', directive: 'noindex,nofollow', version: 2 });
    expect(repository.setArticleSiteRobots).toHaveBeenCalledWith(
      actor,
      { articleSiteId: ARTICLE_SITE, directive: 'noindex,nofollow', now: '2026-09-18T14:00:00.000Z' },
    );
  });

  it('memetakan index ke enum penyimpanan', async () => {
    const { service, repository } = harness({
      setArticleSiteRobots: async () => ({ articleSiteId: 'as-1', directive: 'index,follow', version: 3 }),
    });
    const result = await service.setSiteRobots(actor, { articleSiteId: ARTICLE_SITE, directive: 'index' });
    expect(result.ok).toBe(true);
    expect(repository.setArticleSiteRobots).toHaveBeenCalledWith(
      actor,
      { articleSiteId: ARTICLE_SITE, directive: 'index,follow', now: '2026-09-18T14:00:00.000Z' },
    );
  });

  it('menolak payload yang tidak valid', async () => {
    const { service, repository } = harness();
    const result = await service.setSiteRobots(actor, { articleSiteId: 'bukan-uuid', directive: 'noindex' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
    expect(repository.setArticleSiteRobots).not.toHaveBeenCalled();
  });

  it('memetakan penolakan akses ke denial non-disclosing', async () => {
    const { service, repository } = harness({
      setArticleSiteRobots: async () => {
        throw new PublishingAccessDeniedError();
      },
    });
    const result = await service.setSiteRobots(actor, { articleSiteId: ARTICLE_SITE, directive: 'noindex' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.recordDenial).toHaveBeenCalled();
  });
});

describe('PublicationService request validation', () => {  it('menolak payload mentah yang tidak valid', async () => {
    const { service, repository } = harness();
    const result = await service.request(actor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
    expect(repository.getArticleVariantContext).not.toHaveBeenCalled();
  });

  it('menolak override yang merujuk site di luar permintaan', async () => {
    const { service } = harness();
    const result = await service.request(actor, {
      ...singleRequest,
      overrides: { [SITE_B]: { title: 'Judul Override Valid', description: LONG_DESCRIPTION } },
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('mewajibkan override per site untuk multi-site', async () => {
    const { service } = harness();
    const result = await service.request(actor, {
      articleId: ARTICLE,
      siteIds: [SITE_A, SITE_B],
      idempotencyKey: 'key-1',
      options: {},
      overrides: {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak override duplikat antar site', async () => {
    const { service } = harness();
    const duplicate = { title: 'Judul Sama Persis Di Sini', description: LONG_DESCRIPTION };
    const result = await service.request(actor, {
      articleId: ARTICLE,
      siteIds: [SITE_A, SITE_B],
      idempotencyKey: 'key-1',
      options: {},
      overrides: { [SITE_A]: duplicate, [SITE_B]: { ...duplicate } },
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menerima multi-site dengan override berbeda', async () => {
    const { service, repository } = harness();
    const result = await service.request(actor, {
      articleId: ARTICLE,
      siteIds: [SITE_A, SITE_B],
      idempotencyKey: 'key-1',
      options: {},
      overrides: {
        [SITE_A]: { title: 'Judul Pertama Yang Unik Sekali', description: LONG_DESCRIPTION },
        [SITE_B]: { title: 'Judul Kedua Yang Jelas Berbeda', description: OTHER_DESCRIPTION },
      },
    });
    expect(result.ok).toBe(true);
    expect(repository.acceptPublication).toHaveBeenCalledTimes(1);
  });

  it('meluaskan permintaan kota ke region dan apex dengan kanonis primer', async () => {
    const city = '0199a2b3-4c5d-7e8f-9012-3456789abc11';
    const region = '0199a2b3-4c5d-7e8f-9012-3456789abc12';
    const apex = '0199a2b3-4c5d-7e8f-9012-3456789abc13';
    const context = {
      ...variantContext,
      variants: [
        { siteId: apex, normalizedHostname: 'portal.test', regionId: null, domainId: 'd-1', customTitle: null, customDescription: null, active: true, state: 'queued', assignmentSource: 'auto', expandedFromSiteId: city },
        { siteId: region, normalizedHostname: 'wonosobo.portal.test', regionId: 'r-1', domainId: 'd-1', customTitle: null, customDescription: null, active: true, state: 'queued', assignmentSource: 'auto', expandedFromSiteId: city },
        { siteId: city, normalizedHostname: 'kota.portal.test', regionId: 'c-1', domainId: 'd-1', customTitle: null, customDescription: null, active: true, state: 'queued', assignmentSource: 'manual', expandedFromSiteId: null },
      ],
      regions: [
        { id: 'r-1', kind: 'region', parentRegionId: null, status: 'active' },
        { id: 'c-1', kind: 'city', parentRegionId: 'r-1', status: 'active' },
      ],
    };
    const { service, repository } = harness({ getArticleVariantContext: async () => context });
    const result = await service.request(actor, { ...singleRequest, siteIds: [city] });
    expect(result.ok).toBe(true);
    expect(repository.acceptPublication).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        siteIds: [city, region, apex],
        cascade: { [apex]: city, [region]: city },
        canonicals: {
          [apex]: 'https://portal.test/judul-kanonik-artikel',
          [region]: 'https://portal.test/judul-kanonik-artikel',
        },
      }),
    );
  });

  it('mengecualikan keluarga cascade dari aturan duplikat', async () => {
    const city = '0199a2b3-4c5d-7e8f-9012-3456789abc11';
    const apex = '0199a2b3-4c5d-7e8f-9012-3456789abc13';
    const context = {
      ...variantContext,
      variants: [
        { siteId: apex, normalizedHostname: 'portal.test', regionId: null, domainId: 'd-1', customTitle: null, customDescription: null, active: true, state: 'published', assignmentSource: 'auto', expandedFromSiteId: city },
        { siteId: city, normalizedHostname: 'kota.portal.test', regionId: 'c-1', domainId: 'd-1', customTitle: null, customDescription: null, active: true, state: 'published', assignmentSource: 'manual', expandedFromSiteId: null },
      ],
      regions: [{ id: 'c-1', kind: 'city', parentRegionId: 'r-1', status: 'active' }],
    };
    const { service, repository } = harness({ getArticleVariantContext: async () => context });
    const result = await service.request(actor, { ...singleRequest, siteIds: [city] });
    expect(result.ok).toBe(true);
    expect(repository.acceptPublication).toHaveBeenCalledTimes(1);
  });

  it('tetap menolak duplikat lintas keluarga manual', async () => {
    const context = {
      ...variantContext,
      variants: [
        { siteId: SITE_A, normalizedHostname: 'a.test', regionId: null, domainId: 'd-1', customTitle: 'Judul Kanonik Artikel', customDescription: null, active: true, state: 'published', assignmentSource: 'manual', expandedFromSiteId: null },
      ],
      regions: [],
    };
    const { service } = harness({ getArticleVariantContext: async () => context });
    const result = await service.request(actor, { ...singleRequest, siteIds: [SITE_B] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });
});

describe('PublicationService request outcomes', () => {
  it('menerbitkan single-site dan menjadwalkan dispatch', async () => {
    const { service, repository, queue } = harness();
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(true);
    expect(queue.schedule).toHaveBeenCalledTimes(1);
    expect(repository.recordDispatchScheduled).toHaveBeenCalledTimes(1);
  });

  it('tetap berhasil saat penjadwalan gagal dan mencatat kegagalan dispatch', async () => {
    const { service, repository } = harness({
      schedule: async () => {
        throw new Error('redis down');
      },
    });
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(true);
    expect(repository.recordDispatchFailure).toHaveBeenCalledTimes(1);
  });

  it('menolak non-disclosing saat konteks varian tidak ditemukan', async () => {
    const { service, repository } = harness({ getArticleVariantContext: async () => null });
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.recordDenial).toHaveBeenCalled();
  });

  it('memetakan konflik idempotency', async () => {
    const { service } = harness({ acceptPublication: async () => ({ kind: 'conflict', existingJobId: 'job-9' }) });
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('memetakan langganan nonaktif ke forbidden', async () => {
    const { service } = harness({
      getArticleVariantContext: async () => {
        throw new PublishingSubscriptionInactiveError('past_due');
      },
    });
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('FORBIDDEN');
  });

  it('memetakan varian duplikat ke invalid input', async () => {
    const { service } = harness({
      acceptPublication: async () => {
        throw new PublishingConflictError('duplicate_variant');
      },
    });
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('memetakan kegagalan tak dikenal ke dependency unavailable', async () => {
    const { service } = harness({
      getArticleVariantContext: async () => {
        throw new Error('db down');
      },
    });
    const result = await service.request(actor, singleRequest);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});

describe('PublicationService retry and unpublish', () => {
  it('menolak retry tanpa jobId', async () => {
    const { service } = harness();
    const result = await service.retry(actor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('mengulang target dan mengembalikan status segar', async () => {
    const { service, repository, queue } = harness();
    const result = await service.retry(actor, { jobId: JOB });
    expect(result.ok).toBe(true);
    expect(repository.retryTargets).toHaveBeenCalledTimes(1);
    expect(queue.schedule).toHaveBeenCalledTimes(1);
  });

  it('menolak non-disclosing saat status retry hilang', async () => {
    const { service } = harness({ getPublication: async () => null });
    const result = await service.retry(actor, { jobId: JOB });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('memetakan konflik worker lease ke invalid state transition', async () => {
    const { service } = harness({
      retryTargets: async () => {
        throw new PublishingConflictError('stale_fence');
      },
    });
    const result = await service.retry(actor, { jobId: JOB });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('memetakan langganan nonaktif saat retry ke forbidden', async () => {
    const { service } = harness({
      retryTargets: async () => {
        throw new PublishingSubscriptionInactiveError('past_due');
      },
    });
    const result = await service.retry(actor, { jobId: JOB });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('FORBIDDEN');
  });

  it('menarik publikasi dan memetakan konflik lease', async () => {
    const okHarness = harness();
    const okResult = await okHarness.service.unpublish(actor, { jobId: JOB });
    expect(okResult.ok).toBe(true);
    expect(okHarness.repository.unpublishTargets).toHaveBeenCalledTimes(1);

    const conflictHarness = harness({
      unpublishTargets: async () => {
        throw new PublishingConflictError('stale_fence');
      },
    });
    const conflict = await conflictHarness.service.unpublish(actor, { jobId: JOB });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) throw new Error('expected error');
    expect(conflict.error.error.code).toBe('INVALID_STATE_TRANSITION');
  });
});

describe('PublicationService status and suggest', () => {
  it('menolak status tanpa jobId lewat denial', async () => {
    const { service, repository } = harness();
    const result = await service.status(actor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.recordDenial).toHaveBeenCalled();
  });

  it('mengembalikan status pekerjaan yang ada', async () => {
    const { service } = harness();
    const result = await service.status(actor, { jobId: JOB });
    expect(result.ok).toBe(true);
  });

  it('menolak status yang hilang lewat denial', async () => {
    const { service } = harness({ getPublication: async () => null });
    const result = await service.status(actor, { jobId: JOB });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak suggest tanpa konteks artikel lewat denial', async () => {
    const { service } = harness({ getArticleVariantContext: async () => null });
    const result = await service.suggest(actor, { articleId: ARTICLE, siteIds: [SITE_A] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak suggest yang tidak valid', async () => {
    const { service } = harness();
    const result = await service.suggest(actor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });
});
