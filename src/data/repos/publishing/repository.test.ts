import { describe, expect, it } from 'vitest';

import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';

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

function harness(selects: { readonly media: readonly unknown[]; readonly publishers: readonly unknown[] }) {
  const queue: readonly (readonly unknown[])[] = [selects.media, [siteRow()], [], selects.publishers];
  let cursor = 0;
  const chainable: Record<string, (...args: readonly unknown[]) => unknown> = {};
  const terminal = async () => [...(queue[Math.min(cursor++, queue.length - 1)] ?? [])];
  for (const method of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'for']) chainable[method] = () => chainable;
  chainable.limit = terminal;
  const transaction = {
    execute: async () => [],
    select: () => chainable,
  };
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  return new DrizzlePublishingRepository(database as never);
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
