import { describe, expect, it } from 'vitest';

import {
  buildDashboard,
  buildNetworkPublisherClaim,
  filterArticles,
  filterAuditLogs,
  selectNetworkArticles,
} from '@/modules/dashboard/policies';

const article = (overrides: Record<string, unknown> = {}) => ({
  id: 'art-1',
  organizationId: 'org-1',
  regionId: 'region-1',
  categoryId: null,
  publisherId: null,
  authorId: null,
  title: 'Judul Rutan Wonosobo',
  body: 'Isi berita kegiatan warga binaan.',
  source: 'Humas',
  status: 'active',
  ...overrides,
});

const stateWith = (overrides: Record<string, unknown> = {}) => ({
  organizationId: 'org-1',
  articles: [article()],
  articleSites: [],
  sites: [],
  regions: [],
  domains: [],
  publishingJobs: [],
  publishingJobTargets: [],
  media: [],
  ...overrides,
});

describe('filterArticles', () => {
  it('menyaring lintas organisasi dan filter region', () => {
    const state = stateWith({
      articles: [article(), article({ id: 'art-2', organizationId: 'org-lain' }), article({ id: 'art-3', regionId: 'region-2' })],
    });
    expect(filterArticles(state as never, {})).toHaveLength(2);
    expect(filterArticles(state as never, { regionId: 'region-2' })).toHaveLength(1);
  });

  it('mencari pada judul, body, dan source', () => {
    const state = stateWith({});
    expect(filterArticles(state as never, { search: 'rutan' })).toHaveLength(1);
    expect(filterArticles(state as never, { search: 'humas' })).toHaveLength(1);
    expect(filterArticles(state as never, { search: 'tidak-ada' })).toHaveLength(0);
  });

  it('menyaring berdasarkan site dan publication state', () => {
    const state = stateWith({
      articleSites: [
        { organizationId: 'org-1', articleId: 'art-1', siteId: 'site-1', active: true, state: 'published' },
      ],
    });
    expect(filterArticles(state as never, { siteId: 'site-1' })).toHaveLength(1);
    expect(filterArticles(state as never, { siteId: 'site-2' })).toHaveLength(0);
    expect(filterArticles(state as never, { publicationState: 'published' })).toHaveLength(1);
    expect(filterArticles(state as never, { publicationState: 'failed' })).toHaveLength(0);
  });
});

describe('selectNetworkArticles', () => {
  const networkState = () =>
    stateWith({
      sites: [{ organizationId: 'org-1', id: 'site-1', status: 'active', activationState: 'active', regionId: null }],
      regions: [{ organizationId: 'org-1', id: 'region-1', status: 'active' }],
      articleSites: [
        { organizationId: 'org-1', articleId: 'art-1', siteId: 'site-1', active: true, state: 'published' },
      ],
    });

  it('mengembalikan artikel tayang untuk site aktif', () => {
    expect(selectNetworkArticles(networkState() as never, 'site-1')).toHaveLength(1);
  });

  it('kosong untuk site nonaktif atau tanpa assignment published', () => {
    const state = networkState();
    expect(selectNetworkArticles(state as never, 'site-lain')).toEqual([]);
    const queued = stateWith({
      sites: [{ organizationId: 'org-1', id: 'site-1', status: 'active', activationState: 'active', regionId: null }],
      regions: [{ organizationId: 'org-1', id: 'region-1', status: 'active' }],
      articleSites: [
        { organizationId: 'org-1', articleId: 'art-1', siteId: 'site-1', active: true, state: 'queued' },
      ],
    });
    expect(selectNetworkArticles(queued as never, 'site-1')).toEqual([]);
  });
});

describe('buildNetworkPublisherClaim', () => {
  const publisher = {
    id: 'pub-1',
    attributionLabel: 'Humas Rutan',
    type: 'government_institution',
    verificationStatus: 'verified',
  };

  it('menautkan afiliasi aktif terverifikasi', () => {
    const claim = buildNetworkPublisherClaim(publisher as never, [
      { publisherId: 'pub-1', siteId: 'site-1', active: true, verifiedAt: '2026-01-01', institutionName: 'Rutan', claimScopes: ['kegiatan'] },
    ] as never, 'site-1');
    expect(claim).toMatchObject({ attribution: 'Humas Rutan', independent: false, institutionName: 'Rutan' });
  });

  it('netral untuk publisher independen tanpa afiliasi', () => {
    const claim = buildNetworkPublisherClaim(
      { ...publisher, type: 'independent_publisher', verificationStatus: 'unverified' } as never,
      [],
      'site-1',
    );
    expect(claim).toMatchObject({ independent: true, institutionName: null, claimScopes: [] });
  });
});

describe('buildDashboard and filterAuditLogs', () => {
  it('menghitung agregat tenant dan mengabaikan org lain', () => {
    const projection = buildDashboard(
      stateWith({
        domains: [
          { id: 'd-1', organizationId: 'org-1', status: 'active', normalizedHostname: 'portal.example' },
          { organizationId: 'org-1', status: 'inactive' },
        ],
        sites: [
          { id: 's-1', organizationId: 'org-1', status: 'active', domainId: 'd-1', normalizedHostname: 'portal.example' },
          { id: 's-2', organizationId: 'org-1', status: 'active', domainId: 'd-1', normalizedHostname: 'kota.portal.example' },
        ],
        articles: [article({ status: 'active' }), article({ id: 'art-2', status: 'archived' })],
        publishingJobs: [{ organizationId: 'org-1', state: 'queued' }, { organizationId: 'org-lain', state: 'queued' }],
        articleSites: [{ organizationId: 'org-1', state: 'published' }],
        media: [{ organizationId: 'org-1', state: 'active' }],
      }) as never,
    );
    expect(projection.activeDomains).toBe(1);
    expect(projection.activeSubdomains).toBe(1);
    expect(projection.activeSites).toBe(2);
    expect(projection.activeArticles).toBe(1);
    expect(projection.archivedArticles).toBe(1);
    expect(projection.jobsByState.queued).toBe(1);
    expect(projection.successfulSiteOutcomes).toBe(1);
    expect(projection.activeMedia).toBe(1);
  });

  it('menyaring audit log per dimensi dan rentang', () => {
    const logs = [
      { actorId: 'u-1', action: 'article.create', targetType: 'article', outcome: 'succeeded', occurredAt: '2026-09-10T00:00:00.000Z' },
      { actorId: 'u-2', action: 'article.create', targetType: 'article', outcome: 'denied', occurredAt: '2026-09-12T00:00:00.000Z' },
    ];
    expect(filterAuditLogs(logs as never, { actorId: 'u-1' })).toHaveLength(1);
    expect(filterAuditLogs(logs as never, { outcome: 'denied' })).toHaveLength(1);
    expect(filterAuditLogs(logs as never, { from: '2026-09-11T00:00:00.000Z', to: '2026-09-13T00:00:00.000Z' })).toHaveLength(1);
    expect(filterAuditLogs(logs as never, {})).toHaveLength(2);
  });
});
