// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccessManagementForm } from '@/modules/dashboard/components/infrastructure/access-management-form';

const DATA = {
  roles: [{ id: 'role-1', name: 'Editor' }],
  memberships: [{ userId: 'u-1', displayName: 'Anggota Uji', roleId: 'role-1', version: 2 }],
  invitations: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Formulir manajemen akses', () => {
  it('merender tiga panel utama', () => {
    render(<AccessManagementForm data={DATA} command={vi.fn(async () => ({}))} organizationId="org-1" />);
    expect(screen.getByText('Peran baru')).toBeDefined();
    expect(screen.getByText('Penetapan anggota')).toBeDefined();
    expect(screen.getByText('Undang anggota')).toBeDefined();
  });

  it('membuat peran baru lewat command', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(
      <AccessManagementForm data={DATA} command={command} organizationId="org-1" />,
    );
    fireEvent.change(screen.getByLabelText('Nama peran'), { target: { value: 'Redaktur' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'role.create',
        expect.objectContaining({ name: 'Redaktur' }),
      ),
    );
  });

  it('menolak undangan tanpa email dan peran', async () => {
    const { container } = render(
      <AccessManagementForm data={DATA} command={vi.fn(async () => ({}))} organizationId="org-1" />,
    );
    fireEvent.submit(container.querySelectorAll('form')[2] as HTMLFormElement);
    expect(await screen.findByText('Isi email dan peran target dulu.')).toBeDefined();
  });

  it('menerapkan penetapan anggota lewat command', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(
      <AccessManagementForm data={DATA} command={command} organizationId="org-1" />,
    );
    fireEvent.change(screen.getByLabelText(/ID pengguna baru/), { target: { value: 'u-9' } });
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'membership.update',
        expect.objectContaining({ userId: 'u-9' }),
      ),
    );
  });

  it('tidak membatalkan undangan saat konfirmasi ditolak', async () => {
    const command = vi.fn(async () => ({}));
    vi.stubGlobal('confirm', vi.fn(() => false));
    const data = {
      ...DATA,
      invitations: [
        { id: 'inv-1', email: 'calon@portal.id', roleName: 'Editor', status: 'pending', expiresAt: '2026-09-19' },
      ],
    };
    render(<AccessManagementForm data={data} command={command} organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));
    expect(command).not.toHaveBeenCalledWith('invitation.revoke', expect.anything());
  });
});
