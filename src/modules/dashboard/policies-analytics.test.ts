import { describe, expect, it } from 'vitest';

import { buildAnalytics } from '@/modules/dashboard/policies';
import type { DashboardTenantState } from '@/modules/dashboard/models';

const ORG = 'org-1';

function site(id: string, regionId: string | null) {
  return {
    id, organizationId: ORG, domainId: 'd-1', regionId, normalizedHostname: `${id}.example`,
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
    authorId: null, slug: id, title: partial.title, body: 'isi', source: 'redaksi', tags: [],
    status: partial.status, publishedAt: null, archivedAt: null, version: 1,
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
  telegramMappings: [],
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
    const hasil = buildAnalytics(STATE, {}, '2026-09-18');
    expect(hasil.jendela).toEqual({ awal: '2026-06-21', akhir: '2026-09-18' });
    expect(hasil.tugasHarian).toHaveLength(90);
    expect(hasil.tugasHarian.find((titik) => titik.hari === '2026-09-16')).toEqual({
      hari: '2026-09-16', diterbitkan: 1, gagal: 0, antre: 0,
    });
    expect(hasil.tugasHarian.find((titik) => titik.hari === '2026-09-18')).toEqual({
      hari: '2026-09-18', diterbitkan: 0, gagal: 0, antre: 1,
    });
  });

  it('mengelompokkan status artikel dan jam WIB', () => {
    const hasil = buildAnalytics(STATE, {}, '2026-09-18');
    expect(hasil.articlesByStatus).toEqual([
      { key: 'active', count: 1 },
      { key: 'draft', count: 1 },
    ]);
    expect(hasil.aktivitasPerJam).toEqual([
      { hari: 2, jam: 19, jumlah: 1 },
      { hari: 3, jam: 15, jumlah: 1 },
    ]);
  });

  it('menyusun aktivitas terbaru dan arus penerbit', () => {
    const hasil = buildAnalytics(STATE, {}, '2026-09-18');
    expect(hasil.aktivitasTerbaru[0]).toMatchObject({ id: 'job:j-2', status: 'queued' });
    expect(hasil.aktivitasTerbaru.length).toBeLessThanOrEqual(8);
    expect(hasil.arusPenerbit).toEqual([
      { penerbit: 'p-1', situs: 's-1', hasil: 'published', jumlah: 1 },
      { penerbit: 'p-1', situs: 's-2', hasil: 'failed', jumlah: 1 },
    ]);
  });

  it('menghormati filter from untuk jendela dan marginal', () => {
    const hasil = buildAnalytics(STATE, { from: '2026-09-17T00:00:00.000Z' }, '2026-09-18');
    expect(hasil.jendela).toEqual({ awal: '2026-09-17', akhir: '2026-09-18' });
    expect(hasil.tugasHarian).toHaveLength(2);
    expect(hasil.articlesByStatus).toEqual([{ key: 'draft', count: 1 }]);
  });

  it('menghitung penyaluran, tayangan, dan peta label dari article_sites', () => {
    const hasil = buildAnalytics(STATE, {}, '2026-09-18');
    expect(hasil.penyaluranHarian?.find((titik) => titik.hari === '2026-09-16')).toEqual({
      hari: '2026-09-16', diterbitkan: 1, gagal: 0, antre: 0,
    });
    expect(hasil.penyaluranHarian?.find((titik) => titik.hari === '2026-09-17')).toEqual({
      hari: '2026-09-17', diterbitkan: 0, gagal: 1, antre: 0,
    });
    expect(hasil.totalViews).toBe(0);
    expect(hasil.totalPenyaluran).toBe(2);
    expect(hasil.viewsBySite).toEqual([
      { key: 's-1', count: 1, views: 0 },
      { key: 's-2', count: 1, views: 0 },
    ]);
    expect(hasil.siteLabels).toEqual({ 's-1': 's-1.example', 's-2': 's-2.example' });
  });
});
