// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MediaLibrary } from '@/modules/dashboard/components/publishing/media-library';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

vi.mock('next/dynamic', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
});

function asset(index: number, owner: 'organization' | 'article' | 'site') {
  return {
    id: `m-${index}`,
    objectKey: `o/org/p/${owner}/y=2026/berkas-${index}.png`,
    purpose: 'organization-asset',
    mediaType: 'image/png',
    sizeBytes: 100_000,
    widthPx: 512,
    heightPx: 512,
    altText: null,
    caption: null,
    owner: owner === 'organization' ? { kind: 'organization' as const } : owner === 'article' ? { kind: 'article' as const, articleId: 'a-1' } : { kind: 'site' as const, siteId: 's-1' },
    state: 'active',
    createdAt: '2026-09-24T00:00:00.000Z',
  };
}

const DATA = {
  media: [asset(1, 'organization'), asset(2, 'site'), asset(3, 'article')],
  articles: [{ id: 'a-1', title: 'Banjir Wonosobo' }],
  sites: [{ id: 's-1', normalizedHostname: 'wonosobo.fakta01.my.id' }],
};

describe('MediaLibrary', () => {
  it('menampilkan ringkasan persis dan folder according kepemilikan', () => {
    render(<MediaLibrary data={DATA} command={vi.fn()} />);
    expect(screen.getByText('Pustaka Media & Repositori Aset')).toBeDefined();
    expect(screen.getByRole('region', { name: 'Ringkasan pustaka media' }).textContent).toContain('3 aset · 293 KB · 3 aktif · 0 arsip');
    expect(screen.getByText(/3 dari 3 aset dalam filter/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Semua Media/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Organisasi/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Artikel/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Portal Regional/ })).toBeDefined();
  });

  it('menyaring folder dan mencari nama berkas', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary data={DATA} command={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Portal Regional/ }));
    expect(screen.getByText(/Menampilkan 1 dari 1 aset dalam filter/)).toBeDefined();
    expect(screen.getByText('wonosobo.fakta01.my.id')).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Semua Media/ }));
    expect(screen.getByText(/Menampilkan 3 dari 3 aset dalam filter/)).toBeDefined();
    await user.type(screen.getByLabelText('Cari Berkas'), 'berkas-3');
    expect(screen.getByText(/Menampilkan 1 dari 1 aset dalam filter/)).toBeDefined();
    expect(screen.queryByText('berkas-1.png')).toBeNull();
  });

  it('menampilkan semua folder sebagai meta dalam', () => {
    render(<MediaLibrary data={{ media: [], articles: [], sites: [] }} command={vi.fn()} />);
    expect(screen.getByText(/Belum ada aset dalam pustaka/)).toBeDefined();
  });

  it('meminta izin akses satu aset saat pratinjau ditekan', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ url: 'https://r2.example/berkas', requiredHeaders: { 'x-amz': 'sig' } }));
    render(<MediaLibrary data={DATA} command={command} />);
    await user.click(screen.getByRole('button', { name: 'Tampilan daftar' }));
    await user.click(screen.getAllByRole('button', { name: 'Buka' })[0]!);
    await waitFor(() => expect(command).toHaveBeenCalledWith('media.read', { mediaId: 'm-1' }));
    expect((await screen.findAllByAltText('berkas-1.png')).length).toBeGreaterThan(0);
  });

  it('memuat halaman berikutnya dari server dan menambahkannya', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => {
      if (action === 'media.list') return { items: [asset(4, 'organization')], nextCursor: null };
      return undefined;
    });
    render(<MediaLibrary data={{ ...DATA, nextCursor: 'kursor-1' }} command={command} />);
    await user.click(screen.getByRole('button', { name: /Muat 24 lagi/ }));
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('media.list', expect.objectContaining({ cursor: 'kursor-1', limit: 24 })),
    );
    expect(screen.getByText(/Menampilkan 4 dari 4 aset dalam filter/)).toBeDefined();
  });

  it('memuat ulang dari server saat filter berubah', async () => {
    const user = userEvent.setup();
    const all = [asset(1, 'organization'), asset(2, 'site'), asset(3, 'article')];
    const command = vi.fn(async (action: string, payload: unknown) => {
      if (action !== 'media.list') return undefined;
      const owner = (payload as { readonly owner?: string }).owner;
      const items = owner === undefined ? all : all.filter((item) => (item.owner as { readonly kind: string }).kind === owner);
      return { items, nextCursor: null };
    });
    render(<MediaLibrary data={DATA} command={command} />);
    await user.click(screen.getByRole('button', { name: /Portal Regional/ }));
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('media.list', expect.objectContaining({ owner: 'site' })),
    );
    expect(screen.getByText(/Menampilkan 1 dari 1 aset dalam filter/)).toBeDefined();
  });
});
