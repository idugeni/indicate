// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AccessIntegrationsV2 } from '@/modules/dashboard/components/settings/access-integrations-v2';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

vi.mock('@/modules/dashboard/components/settings/integration-settings', () => ({
  IntegrationSettings: ({ canManage }: { canManage?: boolean }) => (
    <div data-testid="api-surface">API surface · {canManage ? 'manage' : 'read-only'}</div>
  ),
}));

vi.mock('@/modules/dashboard/components/settings/access-key-settings', () => ({
  AccessKeySettings: ({ canManage }: { canManage?: boolean }) => (
    <div data-testid="dashboard-access-surface">
      Dashboard access · {canManage ? 'manage' : 'read-only'}
    </div>
  ),
}));

vi.mock('@/modules/dashboard/components/settings/login-methods-form', () => ({
  LoginMethodsForm: () => <div data-testid="identity-surface">Identity surface</div>,
}));

vi.mock('@/modules/dashboard/components/settings/profile-form', () => ({
  ProfileForm: () => <div data-testid="profile-surface">Profile surface</div>,
}));

afterEach(cleanup);

describe('AccessIntegrationsV2', () => {
  const data = {
    apiKeys: [
      {
        id: 'api-1',
        name: 'Publisher',
        status: 'active',
        expiresAt: null,
        lastUsedAt: null,
        version: 1,
      },
      {
        id: 'api-2',
        name: 'Expiring',
        status: 'active',
        expiresAt: '2026-10-20T00:00:00.000Z',
        lastUsedAt: null,
        version: 2,
      },
    ],
    accessKeys: [
      {
        id: 'access-1',
        name: 'Laptop',
        status: 'active',
        expiresAt: null,
        lastUsedAt: null,
        version: 1,
      },
    ],
    email: { configured: true, defaultFrom: 'noreply@example.id', webhook: true },
  };

  it('renders a decision-oriented posture instead of the legacy settings tab shell', () => {
    render(
      <AccessIntegrationsV2
        data={data}
        command={vi.fn(async () => null)}
        permissions={
          new Set([INTEGRATIONS_PERMISSIONS.apiKeyRead, INTEGRATIONS_PERMISSIONS.apiKeyManage])
        }
      />,
    );

    expect(screen.getByRole('heading', { name: 'Access & Integrations', level: 1 })).toBeDefined();
    expect(screen.getByText('Connection Posture')).toBeDefined();
    expect(screen.getByText('Attention Queue')).toBeDefined();
    expect(screen.getByText('API aktif')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('Akses aktif')).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Area Access & Integrations' })).toBeDefined();
    expect(screen.queryByText('Bagian pengaturan')).toBeNull();
  });

  it('drills into each access workflow without losing the shared command center', () => {
    render(
      <AccessIntegrationsV2
        data={data}
        command={vi.fn(async () => null)}
        permissions={
          new Set([INTEGRATIONS_PERMISSIONS.apiKeyRead, INTEGRATIONS_PERMISSIONS.apiKeyManage])
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /API Access/ }));
    expect(screen.getByTestId('api-surface').textContent).toContain('manage');

    fireEvent.click(screen.getByRole('button', { name: /Dashboard Access/ }));
    expect(screen.getByTestId('dashboard-access-surface').textContent).toContain('manage');

    fireEvent.click(screen.getByRole('button', { name: /Identity/ }));
    expect(screen.getByTestId('identity-surface')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Profile/ }));
    expect(screen.getByTestId('profile-surface')).toBeDefined();
  });

  it('respects read-only permissions at the action surface', () => {
    render(
      <AccessIntegrationsV2
        data={data}
        command={vi.fn(async () => null)}
        permissions={new Set([INTEGRATIONS_PERMISSIONS.apiKeyRead])}
      />,
    );

    expect(screen.getByText(/api_key\.manage/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /API Access/ }));
    expect(screen.getByTestId('api-surface').textContent).toContain('read-only');

    fireEvent.click(screen.getByRole('button', { name: /Dashboard Access/ }));
    expect(screen.getByTestId('dashboard-access-surface').textContent).toContain('read-only');
  });
});
