// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CommandPalette } from '@/modules/dashboard/components/command-palette';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

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
    render(<CommandPalette />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka navigasi cepat' }));
    expect(await screen.findByLabelText('Cari perintah atau rute Dashboard')).toBeDefined();
    expect(await screen.findByText('Beranda')).toBeDefined();
  });

  it('menyaring perintah sesuai kata kunci', async () => {
    render(<CommandPalette />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka navigasi cepat' }));
    const input = await screen.findByLabelText('Cari perintah atau rute Dashboard');
    fireEvent.change(input, { target: { value: 'langganan' } });
    expect(await screen.findByText('Langganan')).toBeDefined();
    expect(screen.queryByText('Beranda')).toBe(null);
    expect(screen.getByText('1 hasil tersedia.')).toBeDefined();
  });

  it('menampilkan pesan kosong saat tidak ada yang cocok', async () => {
    render(<CommandPalette />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka navigasi cepat' }));
    const input = await screen.findByLabelText('Cari perintah atau rute Dashboard');
    fireEvent.change(input, { target: { value: 'zzz-tidak-ada' } });
    expect(await screen.findByText('Tidak ada perintah atau rute yang cocok dengan kata kunci.')).toBeDefined();
  });

  it('menavigasi ke rute saat opsi dipilih', async () => {
    render(<CommandPalette />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka navigasi cepat' }));
    await screen.findByText('Langganan');
    fireEvent.click(screen.getByRole('option', { name: /langganan/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard?view=billing'));
  });
});
