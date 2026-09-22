// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CachePurgeForm } from '@/modules/dashboard/components/infrastructure/cache-purge-form';

afterEach(() => {
  cleanup();
});

const SITES = [
  { id: 'site-1', normalizedHostname: 'portal.example' },
  { id: 'site-2', normalizedHostname: 'berita.example' },
];

function setup(command: (action: string, payload: unknown) => Promise<unknown>) {
  return render(<CachePurgeForm data={{ sites: SITES }} command={command} />);
}

describe('CachePurgeForm bulk guard', () => {
  it('mengunci submit massal hingga checkbox dicentang', async () => {
    const command = vi.fn(async () => ({ sites: [{ hostname: 'portal.example' }] }));
    setup(command);
    const button = screen.getByRole('button', { name: /bersihkan sekarang/i });
    expect(button.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(button.hasAttribute('disabled')).toBe(false);

    fireEvent.click(button);
    fireEvent.click(await screen.findByRole('button', { name: /ya, bersihkan/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('site.cache.purge', { confirmBulk: true }));
    expect(await screen.findByText(/Permintaan dikirim untuk semua situs \(1 situs\)/)).toBeDefined();
  });

  it('menampilkan notice error saat command null', async () => {
    setup(vi.fn(async () => null));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /bersihkan sekarang/i }));
    fireEvent.click(await screen.findByRole('button', { name: /ya, bersihkan/i }));
    expect(await screen.findByText(/Bersihkan cache gagal/)).toBeDefined();
  });
});

describe('CachePurgeForm single site', () => {
  it('mengirim siteId tanpa konfirmasi massal', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ sites: [{ hostname: 'portal.example' }] }));
    setup(command);
    await user.click(screen.getByLabelText('Target'));
    await user.click(await screen.findByRole('option', { name: 'portal.example' }));
    expect(screen.queryByRole('checkbox')).toBe(null);

    fireEvent.click(screen.getByRole('button', { name: /bersihkan sekarang/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('site.cache.purge', { siteId: 'site-1' }));
    expect(await screen.findByText(/Permintaan dikirim untuk/)).toBeDefined();
  });

  it('mereset centang saat target berubah', async () => {
    const user = userEvent.setup();
    setup(vi.fn(async () => ({ sites: [] })));
    fireEvent.click(screen.getByRole('checkbox'));
    await user.click(screen.getByLabelText('Target'));
    await user.click(await screen.findByRole('option', { name: 'portal.example' }));
    await user.click(screen.getByLabelText('Target'));
    await user.click(await screen.findByRole('option', { name: 'Semua situs' }));
    expect(screen.getByRole('button', { name: /bersihkan sekarang/i }).hasAttribute('disabled')).toBe(true);
  });
});
