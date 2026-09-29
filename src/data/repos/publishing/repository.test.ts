import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';

import {
  DrizzlePublishingRepository,
  MEDIA_SNAPSHOT_COLLECTIONS,
  PUBLISHING_SNAPSHOT_COLLECTIONS,
} from '@/data/repos/publishing/repository';
import {
  articleSites,
  articles,
  auditLogs,
  domains,
  invalidationTasks,
  media,
  mediaKeyReservations,
  objectCleanupTasks,
  organizations,
  publishingJobs,
  publishingJobTargets,
  siteSettings,
  sites,
} from '@/data/schema';
import type { PublishingSnapshotCollection } from '@/modules/publishing/ports';

const CONTEXT = {
  organizationId: 'o1',
  siteId: 's1',
  domainId: 'd1',
  normalizedHostname: 'portal.example',
  regionId: null,
  routingVersion: 1,
  contentVersion: 1,
} as const;

function mediaRow() {
  return {
    organizationId: 'o1',
    id: 'm-org',
    objectKey: 'o/o1/p/organization-asset/y=2026/m=09/organization/24-logo-abcdef1234567890.png',
    purpose: 'organization-asset',
    mediaType: 'image/png',
    sizeBytes: 216122,
    checksum: 'abc',
    state: 'active',
    articleId: null,
    siteId: null,
    organizationAsset: true,
    version: 1,
    createdAt: new Date('2026-09-24T00:00:00.000Z'),
    updatedAt: new Date('2026-09-24T00:00:00.000Z'),
    thumbObjectKey: null,
    widthPx: 512,
    heightPx: 512,
  };
}

function siteRow() {
  return {
    site: {
      id: 's1',
      organizationId: 'o1',
      normalizedHostname: 'portal.example',
    },
  };
}

interface HarnessSelects {
  readonly media: readonly unknown[];
  readonly publishers: readonly unknown[];
  readonly extra?: readonly (readonly unknown[])[];
}

interface RecordedQueryCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

function buildHarness(selects: HarnessSelects) {
  const queue: readonly (readonly unknown[])[] = [selects.media, [siteRow()], [], selects.publishers, ...(selects.extra ?? [])];
  let cursor = 0;
  const recorded: RecordedQueryCall[] = [];
  const chainable: Record<string, (...args: readonly unknown[]) => unknown> = {};
  const terminal = async () => [...(queue[Math.min(cursor++, queue.length - 1)] ?? [])];
  for (const method of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'for']) {
    chainable[method] = (...args: readonly unknown[]) => {
      recorded.push({ method, args });
      return chainable;
    };
  }
  chainable.limit = terminal;
  const transaction = {
    execute: async () => [],
    select: () => chainable,
  };
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  return { repository: new DrizzlePublishingRepository(database as never), recorded };
}

function harness(selects: HarnessSelects) {
  return buildHarness(selects).repository;
}

describe('authorizePublicMedia organization assets', () => {
  it('mengizinkan aset organisasi yang dirujuk publisher aktif', async () => {
    const repository = harness({ media: [mediaRow()], publishers: [{ id: 'p1' }] });
    const asset = await repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1');
    expect(asset?.id).toBe('m-org');
  });

  it('menolak aset organisasi tanpa rujukan publisher', async () => {
    const repository = harness({ media: [mediaRow()], publishers: [] });
    await expect(repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1')).resolves.toBe(null);
  });

  it('menolak media yang tidak ada', async () => {
    const repository = harness({ media: [], publishers: [{ id: 'p1' }] });
    await expect(repository.authorizePublicMedia({ ...CONTEXT }, 'm-missing', 'req-1')).resolves.toBe(null);
  });
});

describe('authorizePublicMedia organization article images', () => {
  it('mengizinkan inline organisasi yang disematkan artikel tayang', async () => {
    const repository = harness({ media: [{ ...mediaRow(), purpose: 'article-inline', mediaType: 'image/jpeg' }], publishers: [], extra: [[], [], [{ id: 'a1' }]] });
    expect((await repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1'))?.id).toBe('m-org');
  });

  it('menolak inline organisasi tanpa rujukan tayang', async () => {
    const repository = harness({ media: [{ ...mediaRow(), purpose: 'article-inline', mediaType: 'image/jpeg' }], publishers: [], extra: [[], [], []] });
    await expect(repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1')).resolves.toBe(null);
  });

  it('mengizinkan sampul organisasi yang menjadi lead artikel tayang', async () => {
    const repository = harness({ media: [{ ...mediaRow(), purpose: 'article-cover', mediaType: 'image/jpeg' }], publishers: [], extra: [[{ id: 'a1' }]] });
    expect((await repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1'))?.id).toBe('m-org');
  });

  it('menolak media organisasi bukan gambar walau dirujuk', async () => {
    const repository = harness({ media: [{ ...mediaRow(), purpose: 'article-inline', mediaType: 'application/pdf' }], publishers: [], extra: [[], [], [{ id: 'a1' }]] });
    await expect(repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1')).resolves.toBe(null);
  });
});

/**
 * Compile a recorded condition to SQL through the real query builder.
 *
 * @remarks The projection is deliberately a single non-tenant column. A bare
 * `select()` projects every column, so `"organization_id"` would appear in the
 * text whether or not the condition carried a tenant predicate, and the
 * assertions below would pass vacuously. Narrowing the projection confines every
 * occurrence of that identifier to the condition under test.
 */
function compileCondition(condition: unknown): { readonly text: string; readonly params: readonly unknown[] } {
  const built = new QueryBuilder().select({ probe: media.id }).from(media).where(condition as SQL).limit(1).toSQL();
  return { text: built.sql, params: built.params };
}

/**
 * Compile a recorded condition that was written against `article_sites`.
 *
 * @remarks `compileCondition` projects from `media`, so an assignment condition
 * would not mention `"article_id"` at all. Compiling against the real table is
 * what makes the tenant assertion meaningful rather than vacuous.
 */
function compileAssignmentCondition(condition: unknown): { readonly text: string; readonly params: readonly unknown[] } {
  const built = new QueryBuilder().select({ probe: articleSites.id }).from(articleSites).where(condition as SQL).limit(1).toSQL();
  return { text: built.sql, params: built.params };
}

describe('archiveMedia menjadwalkan penghapusan objek', () => {
  it('mencatat object_cleanup_tasks untuk kunci yang diarsipkan', async () => {
    const archived = { ...mediaRow(), state: 'archived', version: 2 };
    const inserted: { table: unknown; values: Record<string, unknown> }[] = [];
    const queue: readonly unknown[][] = [[mediaRow()], []];
    let cursor = 0;
    const chainable: Record<string, unknown> = {};
    const next = () => queue[Math.min(cursor++, queue.length - 1)] ?? [];
    for (const method of ['from', 'where', 'innerJoin', 'limit', 'for']) chainable[method] = () => chainable;
    chainable.then = (resolve: (value: readonly unknown[]) => unknown) => resolve(next());
    const transaction = {
      execute: async () => [],
      select: () => chainable,
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [archived] }) }) }),
      insert: (table: unknown) => ({ values: async (values: Record<string, unknown>) => { inserted.push({ table, values }); return []; } }),
    };
    const repository = new DrizzlePublishingRepository({ transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) } as never);

    await repository.archiveMedia(
      { organizationId: 'o1', actorType: 'system', actorId: 'worker', entryPoint: 'worker', requestId: 'req-1', regionScopeId: null, permissionSet: new Set(['media.manage']) } as never,
      'm-org',
      1,
      '2026-09-28T00:00:00.000Z',
    );

    const cleanup = inserted.find((entry) => entry.table === objectCleanupTasks);
    expect(cleanup).toBeDefined();
    expect(cleanup?.values).toMatchObject({
      organizationId: 'o1',
      objectKey: mediaRow().objectKey,
      reason: 'media.archived',
      status: 'pending',
      attempts: 0,
    });
    expect(inserted.some((entry) => entry.table === auditLogs)).toBe(true);
  });
});

describe('isolasi tenant pada SQL yang dihasilkan', () => {
  it('setiap condition where membawa predikat organisasi milik pemanggil', async () => {
    const { repository, recorded } = buildHarness({ media: [mediaRow()], publishers: [{ id: 'p1' }] });
    await repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1');
    const conditions = recorded.filter((call) => call.method === 'where');
    expect(conditions.length).toBeGreaterThanOrEqual(4);
    for (const call of conditions) {
      const { text, params } = compileCondition(call.args[0]);
      expect(text).toContain('"organization_id"');
      expect(params).toContain(CONTEXT.organizationId);
    }
  });

  it('setiap join menyambungkan kolom organisasinya, bukan join telanjang', async () => {
    const { repository, recorded } = buildHarness({ media: [mediaRow()], publishers: [{ id: 'p1' }] });
    await repository.authorizePublicMedia({ ...CONTEXT }, 'm-org', 'req-1');
    const joins = recorded.filter((call) => call.method === 'innerJoin' || call.method === 'leftJoin');
    expect(joins.length).toBeGreaterThanOrEqual(1);
    for (const call of joins) {
      expect(compileCondition(call.args[1]).text).toContain('"organization_id"');
    }
  });

  it('kontrol negatif: condition tanpa predikat tenant terdeteksi hilang', () => {
    const unscoped = and(eq(media.id, 'm-org'), eq(media.state, 'active'));
    const { text, params } = compileCondition(unscoped);
    expect(text).not.toContain('"organization_id"');
    expect(params).not.toContain(CONTEXT.organizationId);
  });
});

/**
 * Drive `snapshot()` through a recording transaction.
 *
 * @remarks Results are keyed by table rather than queued by call order:
 * `snapshot()` skips the select for any collection the caller did not request,
 * so a positional queue would hand each fixture to the wrong query as soon as
 * anything was filtered out.
 */
function snapshotHarness(
  assignments: readonly Record<string, unknown>[],
  collections?: ReadonlySet<PublishingSnapshotCollection>,
) {
  const article = { id: 'a1', regionId: null, status: 'active', scheduledAt: null, leadMediaId: null, title: 'Artikel Uji', slug: 'artikel-uji' };
  const site = { id: 's1', regionId: null, domainId: 'd1', normalizedHostname: 'portal.example', status: 'active', activationState: 'active' };
  // Keyed by table, not by cursor: `snapshot()` skips the selects whose
  // collection was not requested, so a positional queue would hand each result
  // to the wrong query once anything is filtered out.
  const results: Record<string, unknown[]> = {
    organizations: [{ id: 'o1' }],
    articles: [article],
    sites: [site],
    domains: [],
    siteSettings: [],
    mediaKeyReservations: [],
    objectCleanupTasks: [],
    invalidationTasks: [],
    publishingJobs: [],
    publishingJobTargets: [],
    articleSites: [...assignments],
  };
  const nameOf = new Map<unknown, string>(
    Object.entries({
      organizations,
      articles,
      sites,
      domains,
      siteSettings,
      mediaKeyReservations,
      objectCleanupTasks,
      invalidationTasks,
      publishingJobs,
      publishingJobTargets,
      articleSites,
    }).map(([name, table]) => [table, name]),
  );
  let pending: readonly unknown[] = [];
  const recorded: RecordedQueryCall[] = [];
  const chainable: Record<string, (...args: readonly unknown[]) => unknown> = {};
  for (const method of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'for', 'limit']) {
    chainable[method] = (...args: readonly unknown[]) => {
      recorded.push({ method, args });
      if (method === 'from') pending = results[nameOf.get(args[0]) ?? ''] ?? [];
      return method === 'limit' ? Promise.resolve(pending) : chainable;
    };
  }
  const transaction = { execute: async () => [], select: () => chainable };
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  const repository = new DrizzlePublishingRepository(database as never);
  return {
    repository,
    recorded,
    snapshot: () => repository.snapshot('o1', null, collections),
  };
}

describe('snapshot() memuat assignment artikel-situs untuk form Penyaluran', () => {
  it('mengembalikan baris assignment sehingga "Isi jumlah tayang" punya situs tujuan', async () => {
    const assignments = [{ id: 'as-1', articleId: 'a1', siteId: 's1', state: 'published', active: true }];
    const { snapshot } = snapshotHarness(assignments);
    expect((await snapshot())?.articleSites).toEqual(assignments);
  });

  it('membatasi query assignment dan menguncinya ke organisasi pemanggil', async () => {
    const { recorded, snapshot } = snapshotHarness([]);
    await snapshot();
    expect(recorded.filter((call) => call.method === 'limit').length).toBeGreaterThanOrEqual(1);
    for (const condition of recorded.filter((call) => call.method === 'where').map((call) => call.args[0])) {
      const { params } = compileAssignmentCondition(condition);
      expect(params).toContain('o1');
    }
  });

  it('kontrol negatif: condition tanpa predikat tenant terdeteksi hilang', () => {
    const unscoped = eq(articleSites.id, 'as-1');
    expect(compileAssignmentCondition(unscoped).params).not.toContain('o1');
  });

  it('menyembunyikan assignment yang artikelnya di luar cakupan', async () => {
    const assignments = [{ id: 'as-1', articleId: 'a-luar', siteId: 's1', state: 'published', active: true }];
    const { snapshot } = snapshotHarness(assignments);
    expect((await snapshot())?.articleSites).toEqual([]);
  });
});

describe('snapshot() hanya membaca koleksi yang diminta', () => {
  it('tidak menanyakan tabel yang tidak ada dalam daftar koleksi', async () => {
    const { recorded, snapshot } = snapshotHarness([], MEDIA_SNAPSHOT_COLLECTIONS);
    await snapshot();
    const tables = recorded.filter((call) => call.method === 'from').map((call) => call.args[0]);
    expect(tables).not.toContain(mediaKeyReservations);
    expect(tables).not.toContain(objectCleanupTasks);
    expect(tables).not.toContain(invalidationTasks);
    expect(tables).not.toContain(publishingJobs);
  });

  it('koleksi yang tidak diminta kembali kosong, bukan data basi', async () => {
    const { snapshot } = snapshotHarness([{ id: 'as-1', articleId: 'a1', siteId: 's1', state: 'published', active: true }], MEDIA_SNAPSHOT_COLLECTIONS);
    const result = await snapshot();
    expect(result?.articleSites).toEqual([]);
    expect(result?.jobs).toEqual([]);
  });

  it('koleksi yang diminta tetap terisi', async () => {
    const { snapshot } = snapshotHarness([{ id: 'as-1', articleId: 'a1', siteId: 's1', state: 'published', active: true }], PUBLISHING_SNAPSHOT_COLLECTIONS);
    const result = await snapshot();
    expect(result?.articleSites).toHaveLength(1);
    expect(result?.articles).toHaveLength(1);
    expect(result?.sites).toHaveLength(1);
  });
});
