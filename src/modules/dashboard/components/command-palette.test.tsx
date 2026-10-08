// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CommandPalette } from '@/modules/dashboard/components/command-palette';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const ALL_PERMISSIONS = new Set<string>([
  DASHBOARD_PERMISSIONS.auditRead,
  INTEGRATIONS_PERMISSIONS.apiKeyRead,
  INTEGRATIONS_PERMISSIONS.subscriptionRead,
  INTEGRATIONS_PERMISSIONS.superAdmin,
  INTEGRATIONS_PERMISSIONS.contentManage,
]);

const openPalette = async (permissions: ReadonlySet<string>) => {
  render(<CommandPalette permissions={permissions} />);
  fireEvent.click(screen.getByRole('button', { name: 'Buka navigasi cepat' }));
  return screen.findByLabelText('Cari perintah atau rute Dashboard');
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {
        return undefined;
      }
      unobserve(): void {
        return undefined;
      }
      disconnect(): void {
        return undefined;
      }
    },
  );
  if (typeof Element !== 'undefined' && Element.prototype.scrollIntoView === undefined) {
    Element.prototype.scrollIntoView = () => undefined;
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  pushMock.mockReset();
});

describe('Palet perintah', () => {
  it('membuka dialog pencarian dari tombol pemicu', async () => {
    await openPalette(ALL_PERMISSIONS);
    expect((await screen.findAllByText('Command Center')).length).toBeGreaterThan(0);
  });

  it('menyaring perintah sesuai kata kunci', async () => {
    const input = await openPalette(ALL_PERMISSIONS);
    fireEvent.change(input, { target: { value: 'billing' } });
    expect(await screen.findByText('Billing')).toBeDefined();
    expect(screen.queryByText('Command Center')).toBe(null);
    expect(screen.getByText('1 hasil tersedia.')).toBeDefined();
  });

  it('menampilkan pesan kosong saat tidak ada yang cocok', async () => {
    const input = await openPalette(ALL_PERMISSIONS);
    fireEvent.change(input, { target: { value: 'zzz-tidak-ada' } });
    expect(await screen.findByText('Tidak ada perintah atau rute yang cocok dengan kata kunci.')).toBeDefined();
  });

  it('menavigasi ke rute saat opsi dipilih', async () => {
    await openPalette(ALL_PERMISSIONS);
    await screen.findByText('Billing');
    fireEvent.click(screen.getByRole('option', { name: /billing/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard?view=billing'));
  });

  it('menyembunyikan rute yang tidak diizinkan, sama seperti sidebar', async () => {
    await openPalette(new Set<string>());
    expect((await screen.findAllByText('Command Center')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Billing')).toBe(null);
    expect(screen.queryByText('Audit')).toBe(null);
    expect(screen.queryByText('Customers')).toBe(null);
  });
});
