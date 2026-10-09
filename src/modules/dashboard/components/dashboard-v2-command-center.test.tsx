// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DashboardV2CommandCenter } from '@/modules/dashboard/components/dashboard-v2-command-center';

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
    expect(screen.getByText('INDICATE / COMMAND CENTER')).toBeTruthy();
    expect(screen.getByText('Active sites')).toBeTruthy();
    expect(screen.getByText('Active articles')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Quick actions' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Write article/i }));
    expect(onSelectView).toHaveBeenCalledWith('editorial');
  });
});
