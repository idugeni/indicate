// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';

const actionMock = vi.hoisted(() => vi.fn());

vi.mock('@/modules/dashboard/switch-organization-action', () => ({
  switchActiveOrganization: actionMock,
}));

const ORGANIZATIONS = [
  { id: 'org-1', name: 'Org Pertama', records: [], permissions: [] },
  { id: 'org-2', name: 'Org Kedua', records: [], permissions: [] },
] as never;

afterEach(() => {
  cleanup();
  actionMock.mockReset();
});

describe('Pengalih organisasi', () => {
  it('merender daftar organisasi dengan pilihan aktif', async () => {
    const user = userEvent.setup();
    actionMock.mockImplementation(async () => ({ status: 'idle' }));
    render(
      <OrganizationSwitcher
        organizations={ORGANIZATIONS}
        activeOrganizationId="org-1"
        selectId="uji-org"
        onSwitchCommitted={vi.fn()}
        onSwitchFailed={vi.fn()}
      />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Org Pertama');
    await user.click(trigger);
    expect(await screen.findByRole('option', { name: 'Org Pertama' })).toBeDefined();
    expect(await screen.findByRole('option', { name: 'Org Kedua' })).toBeDefined();
  });

  it('terkunci saat tidak ada organisasi', () => {
    actionMock.mockImplementation(async () => ({ status: 'idle' }));
    render(
      <OrganizationSwitcher
        organizations={[]}
        activeOrganizationId=""
        selectId="uji-org"
        onSwitchCommitted={vi.fn()}
        onSwitchFailed={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true);
  });

  it('memberitahu induk saat peralihan disetujui server', async () => {
    const user = userEvent.setup();
    actionMock.mockImplementation(async (_previous: unknown, data: FormData) => ({
      status: 'ok',
      organizationId: String(data.get('organizationId')),
    }));
    const committed = vi.fn();
    render(
      <OrganizationSwitcher
        organizations={ORGANIZATIONS}
        activeOrganizationId="org-1"
        selectId="uji-org"
        onSwitchCommitted={committed}
        onSwitchFailed={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Org Kedua' }));
    await waitFor(() => expect(committed).toHaveBeenCalledWith('org-2'));
  });

  it('memberitahu induk saat server menolak peralihan', async () => {
    const user = userEvent.setup();
    actionMock.mockImplementation(async () => ({ status: 'error', message: 'Peralihan ditolak' }));
    const onFailed = vi.fn();
    render(
      <OrganizationSwitcher
        organizations={ORGANIZATIONS}
        activeOrganizationId="org-1"
        selectId="uji-org"
        onSwitchCommitted={vi.fn()}
        onSwitchFailed={onFailed}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Org Kedua' }));
    await waitFor(() => expect(onFailed).toHaveBeenCalledWith('Peralihan ditolak'));
  });
});
