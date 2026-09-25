import { describe, expect, it } from 'vitest';

import { buildAnalytics } from '@/modules/dashboard/policies';
import type { DashboardTenantState } from '@/modules/dashboard/models';

const ORG = 'org-1';

function site(id: string, regionId: string | null) {
  return {
    id, organizationId: ORG, domainId: 'd-1', regionId,
    siteLevel: regionId === null ? 'apex' : 'city',
    parentSiteId: regionId === null ? null : 's-2',
    normalizedHostname: `${id}.example`,
    status: 'active', activationState: 'active', version: 1,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  } as const;
}

function article(
  id: string,
  partial: { publisherId: string | null; status: 'draft' | 'active' | 'archived'; createdAt: string; title: string },
) {
  return {
    id, organizationId: ORG, regionId: 'r-1', publisherId: partial.publisherId, categoryId: null,
    categoryIds: [], authorId: null, leadMediaId: null, coverImageUrl: null, slug: id, title: partial.title, excerpt: null, canonicalUrl: null,
    body: 'isi', bodyJson: null, source: 'redaksi', tags: [],
    status: partial.status, publishedAt: null, scheduledAt: null, archivedAt: null, version: 1,
    createdAt: partial.createdAt, updatedAt: partial.createdAt,
  } as const;
}

function assignment(
  id: string,
  partial: { articleId: string; siteId: string; state: 'published' | 'failed'; at: string },
) {
  return {
    id, organizationId: ORG, articleId: partial.articleId, siteId: partial.siteId, state: partial.state,
    stateOccurredAt: partial.at, publishedUrl: null, publishedAt: null, active: true, viewCount: 0,
    assignmentSource: 'manual' as const, expandedFromSiteId: null, customCanonicalUrl: null,
    version: 1, createdAt: partial.at, updatedAt: partial.at,
  } as const;
}

function job(id: string, partial: { articleId: string; state: 'queued' | 'published'; at: string }) {
  return {
    id, organizationId: ORG, articleId: partial.articleId, state: partial.state,
    createdAt: partial.at, occurredAt: partial.at,
  } as const;
}

const STATE: DashboardTenantState = {
  organizationId: ORG,
  organizationName: 'Org Uji',
  domains: [],
  regions: [],
  sites: [site('s-1', 'r-1'), site('s-2', null)],
  siteSettings: [],
  roles: [],
  memberships: [],
  publishers: [],
  affiliations: [],
  categories: [],
  authors: [],
  articles: [
    article('a-1', { publisherId: 'p-1', status: 'active', createdAt: '2026-09-16T10:00:00.000Z', title: 'Kabar' }),
    article('a-2', { publisherId: null, status: 'draft', createdAt: '2026-09-17T10:00:00.000Z', title: 'Draf' }),
  ],
  articleSites: [
    assignment('as-1', { articleId: 'a-1', siteId: 's-1', state: 'published', at: '2026-09-16T12:00:00.000Z' }),
    assignment('as-2', { articleId: 'a-1', siteId: 's-2', state: 'failed', at: '2026-09-17T08:00:00.000Z' }),
  ],
  articleCategories: [],
  media: [],
  publishingJobs: [
    job('j-1', { articleId: 'a-1', state: 'published', at: '2026-09-16T12:00:00.000Z' }),
    job('j-2', { articleId: 'a-2', state: 'queued', at: '2026-09-18T09:00:00.000Z' }),
  ],
  publishingJobTargets: [
    {
      id: 't-1', organizationId: ORG, jobId: 'j-1', articleSiteId: 'as-1', state: 'published',
      occurredAt: '2026-09-16T12:00:00.000Z',
    },
  ],
};

describe('Deret analitik', () => {
  it('membangun jendela 90 hari dan ember harian', () => {
    const result = buildAnalytics(STATE, {}, '2026-09-18');
    expect(result.jendela).toEqual({ awal: '2026-06-21', akhir: '2026-09-18' });
    expect(result.tugasHarian).toHaveLength(90);
    expect(result.tugasHarian.find((point) => point.hari === '2026-09-16')).toEqual({
      hari: '2026-09-16', diterbitkan: 1, gagal: 0, antre: 0,
    });
    expect(result.tugasHarian.find((point) => point.hari === '2026-09-18')).toEqual({
      hari: '2026-09-18', diterbitkan: 0, gagal: 0, antre: 1,
    });
  });

  it('mengelompokkan status artikel dan jam WIB', () => {
    const result = buildAnalytics(STATE, {}, '2026-09-18');
    expect(result.articlesByStatus).toEqual([
      { key: 'active', count: 1 },
      { key: 'draft', count: 1 },
    ]);
    expect(result.aktivitasPerJam).toEqual([
      { hari: 2, jam: 19, jumlah: 1 },
      { hari: 3, jam: 15, jumlah: 1 },
    ]);
  });

  it('menyusun aktivitas terbaru dan arus penerbit', () => {
    const result = buildAnalytics(STATE, {}, '2026-09-18');
    expect(result.aktivitasTerbaru[0]).toMatchObject({ id: 'job:j-2', status: 'queued' });
    expect(result.aktivitasTerbaru.length).toBeLessThanOrEqual(8);
    expect(result.arusPenerbit).toEqual([
      { penerbit: 'p-1', situs: 's-1', hasil: 'published', jumlah: 1 },
      { penerbit: 'p-1', situs: 's-2', hasil: 'failed', jumlah: 1 },
    ]);
  });

  it('menghormati filter from untuk jendela dan marginal', () => {
    const result = buildAnalytics(STATE, { from: '2026-09-17T00:00:00.000Z' }, '2026-09-18');
    expect(result.jendela).toEqual({ awal: '2026-09-17', akhir: '2026-09-18' });
    expect(result.tugasHarian).toHaveLength(2);
    expect(result.articlesByStatus).toEqual([{ key: 'draft', count: 1 }]);
  });

  it('menghitung penyaluran, tayangan, dan peta label dari article_sites', () => {
    const result = buildAnalytics(STATE, {}, '2026-09-18');
    expect(result.penyaluranHarian?.find((point) => point.hari === '2026-09-16')).toEqual({
      hari: '2026-09-16', diterbitkan: 1, gagal: 0, antre: 0,
    });
    expect(result.penyaluranHarian?.find((point) => point.hari === '2026-09-17')).toEqual({
      hari: '2026-09-17', diterbitkan: 0, gagal: 1, antre: 0,
    });
    expect(result.totalViews).toBe(0);
    expect(result.totalPenyaluran).toBe(2);
    expect(result.viewsBySite).toEqual([
      { key: 's-1', count: 1, views: 0 },
      { key: 's-2', count: 1, views: 0 },
    ]);
    expect(result.siteLabels).toEqual({ 's-1': 's-1.example', 's-2': 's-2.example' });
  });
});
