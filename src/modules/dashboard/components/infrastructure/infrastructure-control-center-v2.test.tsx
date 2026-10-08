// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InfrastructureControlCenterV2 } from './infrastructure-control-center-v2';

vi.mock('@/modules/dashboard/components/infrastructure/configuration-panel', () => ({
  ConfigurationPanel: () => <div data-testid="configuration-v1-surface">Topology workflow</div>,
}));
vi.mock('@/modules/dashboard/components/infrastructure/site-settings-form', () => ({
  SiteSettingsForm: () => <div data-testid="site-settings-surface">Brand workflow</div>,
}));
vi.mock('@/modules/dashboard/components/infrastructure/cache-purge-form', () => ({
  CachePurgeForm: () => <div data-testid="cache-surface">Cache workflow</div>,
}));
vi.mock('@/modules/dashboard/components/infrastructure/access-management-form', () => ({
  AccessManagementForm: () => <div data-testid="access-surface">Access workflow</div>,
}));

afterEach(() => {
  cleanup();
});

describe('Infrastructure Control Center V2', () => {
  const data = {
    domains: [{ id: 'd1' }],
    regions: [{ id: 'r1' }],
    sites: [{ id: 's1' }, { id: 's2' }],
    memberships: [{ id: 'm1' }],
    invitations: [{ id: 'i1' }, { id: 'i2' }],
  };

  it('renders an infrastructure command center instead of the legacy tab shell', () => {
    render(<InfrastructureControlCenterV2 data={data} command={vi.fn()} organizationId="org-1" />);
    expect(screen.getByRole('heading', { name: 'Network Infrastructure' })).toBeDefined();
    expect(screen.getByText('Domain')).toBeDefined();
    const sitesLabel = screen.getByText('Situs');
    expect(sitesLabel.nextElementSibling).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Domain & Site Topology/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches focused infrastructure workflows without changing backend contracts', () => {
    render(<InfrastructureControlCenterV2 data={data} command={vi.fn()} organizationId="org-1" />);
    const cacheButton = screen.getByRole('button', { name: /Cache & Delivery/i });
    fireEvent.click(cacheButton);
    expect(screen.getByTestId('cache-surface')).toBeDefined();
    expect(cacheButton).toHaveAttribute('aria-pressed', 'true');
  });
});
