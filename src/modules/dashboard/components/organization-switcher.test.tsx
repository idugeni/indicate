// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
  it('merender daftar organisasi dengan pilihan aktif', () => {
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
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('org-1');
    expect(screen.getByRole('option', { name: 'Org Pertama' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Org Kedua' })).toBeDefined();
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
    expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
  });

  it('memberitahu induk saat peralihan disetujui server', async () => {
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
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'org-2' } });
    await waitFor(() => expect(committed).toHaveBeenCalledWith('org-2'));
  });

  it('memberitahu induk saat server menolak peralihan', async () => {
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
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'org-2' } });
    await waitFor(() => expect(onFailed).toHaveBeenCalledWith('Peralihan ditolak'));
  });
});
