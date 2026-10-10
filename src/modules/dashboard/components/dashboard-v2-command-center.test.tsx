// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DashboardV2CommandCenter } from '@/modules/dashboard/components/dashboard-v2-command-center';
import type { AnalyticsProjection } from '@/modules/dashboard/models';

afterEach(() => cleanup());

describe('DashboardV2CommandCenter', () => {
  it('renders operational metrics and routes quick actions to V2 workspaces', () => {
    const onSelectView = vi.fn();
    render(
      <DashboardV2CommandCenter
        displayName="INDICATE"
        dashboard={{
          activeDomains: 2,
          activeSubdomains: 3,
          activeSites: 4,
          activeArticles: 5,
          archivedArticles: 1,
          jobsByState: { queued: 2, processing: 1, published: 7, failed: 0, retrying: 0, unpublished: 0 },
          successfulSiteOutcomes: 8,
          failedSiteOutcomes: 1,
        }}
        analytics={null}
        onSelectView={onSelectView}
      />,
    );
    expect(screen.getByText('INDICATE / EXECUTIVE OVERVIEW')).toBeTruthy();
    expect(screen.getByText('Active domains')).toBeTruthy();
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    expect(screen.getByText('Delivery success')).toBeTruthy();
    expect(screen.getByText('Total articles')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Quick actions' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Write article/i }));
    expect(onSelectView).toHaveBeenCalledWith('editorial');
  });

  it('never exposes raw UUIDs when analytics labels are missing', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const analytics: AnalyticsProjection = {
      articlesByRegion: [{ key: uuid, count: 1 }],
      articlesBySite: [{ key: uuid, count: 2 }],
      articlesByCategory: [],
      articlesByPublisher: [{ key: uuid, count: 3 }],
      articlesByStatus: [],
      jobsByState: [],
      jobsBySiteRegionAndState: [],
      outcomesBySiteAndState: [],
      outcomesBySiteRegionAndState: [],
      jendela: { awal: '2026-10-01', akhir: '2026-10-10' },
      tugasHarian: [],
      aktivitasPerJam: [],
      aktivitasTerbaru: [],
      arusPenerbit: [],
      siteLabels: {},
      publisherLabels: {},
      regionLabels: {},
    };
    render(
      <DashboardV2CommandCenter
        displayName="INDICATE"
        dashboard={{ activeDomains: 0, activeSubdomains: 0, activeSites: 1, activeArticles: 0, archivedArticles: 0, jobsByState: { queued: 0, processing: 0, published: 0, failed: 0, retrying: 0, unpublished: 0 }, successfulSiteOutcomes: 0, failedSiteOutcomes: 0 }}
        analytics={analytics}
        onSelectView={vi.fn()}
      />,
    );
    expect(screen.queryByText(uuid)).toBeNull();
    expect(screen.getByText('Situs tidak tersedia')).toBeTruthy();
    expect(screen.getByText('Penerbit tidak tersedia')).toBeTruthy();
    expect(screen.getByText('Wilayah tidak tersedia')).toBeTruthy();
  });
});
