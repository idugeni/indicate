import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';

import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { media } from '@/data/schema';

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
  const built = new QueryBuilder().select({ probe: media.id }).from(media).where(condition as SQL).toSQL();
  return { text: built.sql, params: built.params };
}

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
