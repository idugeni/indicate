// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
    const button = screen.getByRole('button', { name: /purge sekarang/i });
    expect(button.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(button.hasAttribute('disabled')).toBe(false);

    fireEvent.click(button);
    fireEvent.click(await screen.findByRole('button', { name: /ya, purge/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('site.cache.purge', { confirmBulk: true }));
    expect(await screen.findByText(/Purge diminta untuk semua situs dalam scope \(1 situs\)/)).toBeDefined();
  });

  it('menampilkan notice error saat command null', async () => {
    setup(vi.fn(async () => null));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /purge sekarang/i }));
    fireEvent.click(await screen.findByRole('button', { name: /ya, purge/i }));
    expect(await screen.findByText(/Purge gagal/)).toBeDefined();
  });
});

describe('CachePurgeForm single site', () => {
  it('mengirim siteId tanpa konfirmasi massal', async () => {
    const command = vi.fn(async () => ({ sites: [{ hostname: 'portal.example' }] }));
    setup(command);
    fireEvent.change(screen.getByLabelText(/target purge/i), { target: { value: 'site-1' } });
    expect(screen.queryByRole('checkbox')).toBe(null);

    fireEvent.click(screen.getByRole('button', { name: /purge sekarang/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('site.cache.purge', { siteId: 'site-1' }));
    expect(await screen.findByText(/Purge diminta untuk/)).toBeDefined();
  });

  it('mereset centang saat target berubah', () => {
    setup(vi.fn(async () => ({ sites: [] })));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText(/target purge/i), { target: { value: 'site-1' } });
    fireEvent.change(screen.getByLabelText(/target purge/i), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /purge sekarang/i }).hasAttribute('disabled')).toBe(true);
  });
});
