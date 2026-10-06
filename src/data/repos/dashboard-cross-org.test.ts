import { describe, expect, it, vi } from 'vitest';

import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { DashboardAccessDeniedError } from '@/modules/dashboard/ports';

const STEWARD = {
  actorType: 'user',
  actorId: 'user-1',
  verifiedAuthUserId: 'auth-1',
  organizationId: 'org-operator',
  permissionSet: new Set(['article.read']),
  platformPermissionSet: new Set(['platform.super_admin']),
  regionScopeId: null,
  entryPoint: 'dashboard',
  requestId: 'req-1',
} as const;

function serializeQuery(query: unknown): { text: string; values: unknown[] } {
  const chunks = (query as { readonly queryChunks?: readonly unknown[] }).queryChunks ?? [];
  const values: unknown[] = [];
  const text = chunks
    .map((chunk) => {
      if (typeof chunk === 'string') return chunk;
      if (chunk === null || chunk === undefined || typeof chunk !== 'object') {
        values.push(chunk);
        return '?';
      }
      if ('value' in chunk) {
        const v = (chunk as { readonly value: unknown }).value;
        if (Array.isArray(v)) return v.map((part) => (typeof part === 'string' ? part : '?')).join('');
        values.push(v);
        return '?';
      }
      return '?';
    })
    .join('');
  return { text, values };
}

function harness(listRows: readonly unknown[] = [], count = 0) {
  const calls: { text: string; values: unknown[] }[] = [];
  const queue: unknown[][] = [ [...listRows], [{ count }] ];
  const database = {
    execute: vi.fn(async (query: unknown) => {
      calls.push(serializeQuery(query));
      return queue.shift() ?? [];
    }),
  };
  const repository = new DrizzleDashboardRepository(database as never);
  return { repository, database, calls };
}

const ROW = {
  organization_id: 'org-upt',
  org_slug: 'rutan-wonosobo',
  org_name: 'RUTAN WONOSOBO',
  id: '0199a2b3-4c5d-7e8f-9012-3456789abcdf',
  region_id: null,
  publisher_id: null,
  category_id: null,
  author_id: null,
  lead_media_id: null,
  cover_image_url: null,
  slug: 'berita-upt',
  title: 'Berita UPT',
  excerpt: null,
  canonical_url: null,
  source: 'Humas',
  tags: ['humas'],
  status: 'active',
  article_type: 'standard',
  is_sponsored: false,
  video_url: null,
  audio_url: null,
  duration_seconds: null,
  published_at: new Date('2026-10-06T04:23:50.000Z'),
  scheduled_at: null,
  archived_at: null,
  version: 2,
  created_at: new Date('2026-10-06T04:23:49.000Z'),
  updated_at: new Date('2026-10-06T04:23:50.000Z'),
  category_ids: [],
  category_names: [],
  portal_hostnames: ['wonosobo.example'],
  published_urls: [],
  published_at_max: null,
};

describe('DrizzleDashboardRepository cross-org steward', () => {
  it('memanggil fungsi SECURITY DEFINER tanpa memuat body', async () => {
    const { repository, calls } = harness([ROW], 1);
    const scope = await repository.readCrossOrgEditorialScope(STEWARD as never, { status: 'active' }, {});
    expect(scope.total).toBe(1);
    expect(scope.articles).toHaveLength(1);
    expect(scope.articles[0]?.body).toBe('');
    expect(scope.articles[0]?.bodyJson).toBeNull();
    expect(scope.articles[0]?.orgName).toBe('RUTAN WONOSOBO');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.text).toContain('list_cross_org_articles');
    expect(calls[1]?.text).toContain('count_cross_org_articles');
    for (const call of calls) {
      expect(call.text).not.toMatch(/body_json/);
    }
  });

  it('menjepit limit dan mengabaikan cursor bukan-uuid', async () => {
    const { repository, calls } = harness([], 0);
    await repository.readCrossOrgEditorialScope(STEWARD as never, {}, { limit: 1000, cursor: 'bukan-uuid' });
    const values = calls[0]?.values ?? [];
    expect(values).toContain(500);
    expect(values).toContain(null);
  });

  it('menetapkan cursor berikutnya hanya saat ada baris lebih', async () => {
    const second = { ...ROW, id: '0199a2b3-4c5d-7e8f-9012-3456789abce0' };
    const full = harness([ROW, second], 2);
    const scope = await full.repository.readCrossOrgEditorialScope(STEWARD as never, {}, { limit: 1 });
    expect(scope.articles).toHaveLength(1);
    expect(scope.articlesNextCursor).toBe(ROW.id);

    const exact = harness([ROW], 1);
    const done = await exact.repository.readCrossOrgEditorialScope(STEWARD as never, {}, { limit: 1 });
    expect(done.articlesNextCursor).toBeNull();
  });

  it('menolak aktor tanpa grant dan steward terkunci region', async () => {
    const { repository } = harness([], 0);
    await expect(
      repository.readCrossOrgEditorialScope({ ...STEWARD, platformPermissionSet: new Set<string>() } as never, {}, {}),
    ).rejects.toBeInstanceOf(DashboardAccessDeniedError);
    await expect(
      repository.readCrossOrgEditorialScope({ ...STEWARD, regionScopeId: 'region-1' } as never, {}, {}),
    ).rejects.toBeInstanceOf(DashboardAccessDeniedError);
  });
});
