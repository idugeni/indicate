import { describe, expect, it } from 'vitest';

import { DrizzleDashboardRepository } from '@/data/repos/dashboard';

interface SiteRow {
  readonly id: string;
  readonly normalizedHostname: string;
}

/**
 * A drizzle-shaped select chain that serves `rows` in id order and records every
 * `limit` it is asked for, so the paging contract is checked without a database.
 */
function pagedTransaction(rows: readonly SiteRow[]) {
  const limits: number[] = [];
  let cursor: string | null = null;
  const transaction = {
    select: () => {
      const chain = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: async (size: number) => {
          limits.push(size);
          const start = cursor === null ? 0 : rows.findIndex((row) => row.id === cursor) + 1;
          const page = rows.slice(start, start + size);
          cursor = page.length === 0 ? cursor : page[page.length - 1]!.id;
          return page;
        },
      };
      return chain;
    },
  };
  return { transaction, limits };
}

function sites(count: number): readonly SiteRow[] {
  return Array.from({ length: count }, (slot, index) => {
    void slot;
    const id = String(index).padStart(6, '0');
    return { id, normalizedHostname: `portal-${id}.example` };
  });
}

async function readAll(rows: readonly SiteRow[], level: 'apex' | 'city' = 'apex') {
  const { transaction, limits } = pagedTransaction(rows);
  const repository = new DrizzleDashboardRepository({} as never) as unknown as {
    readAllActiveSiteRows(tx: unknown, organizationId: string, siteLevel: 'apex' | 'city', regionId: string | null): Promise<readonly SiteRow[]>;
  };
  const result = await repository.readAllActiveSiteRows(transaction, 'org-1', level, null);
  return { result, limits };
}

describe('readAllActiveSiteRows', () => {
  it('returns nothing for an empty network after a single bounded read', async () => {
    const { result, limits } = await readAll([]);
    expect(result).toEqual([]);
    expect(limits).toEqual([500]);
  });

  it('covers a 134-portal apex network in one page', async () => {
    const rows = sites(134);
    const { result, limits } = await readAll(rows);
    expect(result).toEqual(rows);
    expect(limits).toEqual([500]);
  });

  it('does not drop portals past the old 200 ceiling', async () => {
    const rows = sites(201);
    const { result } = await readAll(rows);
    expect(result).toHaveLength(201);
    expect(result.at(-1)).toEqual(rows.at(-1));
  });

  it('pages through 4,154 city portals without duplicates or gaps', async () => {
    const rows = sites(4154);
    const { result, limits } = await readAll(rows, 'city');
    expect(result).toEqual(rows);
    expect(new Set(result.map((row) => row.id)).size).toBe(4154);
    expect(limits).toHaveLength(9);
    expect(limits.every((size) => size === 500)).toBe(true);
  });

  it('issues one extra empty read when the total is an exact multiple of a page', async () => {
    const { result, limits } = await readAll(sites(1000));
    expect(result).toHaveLength(1000);
    expect(limits).toEqual([500, 500, 500]);
  });
});
