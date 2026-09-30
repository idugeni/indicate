// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccessKeySettings } from '@/modules/dashboard/components/settings/access-key-settings';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('pengaturan kunci akses dashboard', () => {
  it('menerbitkan tautan akses sekali lihat', async () => {
    const command = vi.fn(async () => ({ plaintext: 'inda_ujicoba.rahasia' }));
    const onRefresh = vi.fn();
    const { container } = render(<AccessKeySettings command={command} data={{}} onRefresh={onRefresh} />);
    fireEvent.change(screen.getByLabelText('Nama kunci'), { target: { value: 'Laptop cadangan' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('access-key.issue', expect.objectContaining({ name: 'Laptop cadangan' })),
    );
    expect(await screen.findByText(/\/auth\/access-key\?key=/)).toBeDefined();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('menolak menerbitkan tanpa nama', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<AccessKeySettings command={command} data={{}} onRefresh={vi.fn()} />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(command).not.toHaveBeenCalled());
  });

  it('mencabut kunci aktif lalu memuat ulang', async () => {
    const command = vi.fn(async () => ({}));
    const onRefresh = vi.fn();
    render(
      <AccessKeySettings
        command={command}
        data={{
          accessKeys: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Laptop cadangan',
              status: 'active',
              expiresAt: null,
              lastUsedAt: null,
              version: 1,
              createdAt: new Date().toISOString(),
            },
          ],
        }}
        onRefresh={onRefresh}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cabut kunci Laptop cadangan' }));
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('access-key.revoke', {
        accessKeyId: '123e4567-e89b-12d3-a456-426614174000',
        expectedVersion: 1,
      }),
    );
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });
});
