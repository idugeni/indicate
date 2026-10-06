// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ContentManager } from '@/modules/dashboard/components/content/content-manager';

function stubContent(bundle: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => bundle })),
  );
}

const EMPTY = { quotes: [], faqRows: [], showcase: [], channels: [], templates: [] };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Pengelola konten dinamis', () => {
  it('merender tab jenis konten, jumlah baris, dan tombol muat ulang', async () => {
    stubContent(EMPTY);
    render(<ContentManager />);
    expect(screen.getByRole('tab', { name: /^Testimoni/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /^FAQ/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /^Etalase Media/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeDefined();
    expect(await screen.findByText(/Perubahan tayang segera setelah disimpan/)).toBeDefined();
    expect(screen.getByText('Belum ada baris testimoni di situs publik.')).toBeDefined();
  });

  it('berpindah tab aktif saat tab diklik', async () => {
    stubContent(EMPTY);
    render(<ContentManager />);
    await screen.findByText(/Perubahan tayang segera setelah disimpan/);
    fireEvent.click(screen.getByRole('tab', { name: /^FAQ/ }));
    expect(screen.getByRole('tab', { name: /^FAQ/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /^Testimoni/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('menyaring baris dengan pencarian dan memberi judul manusia pada kartu', async () => {
    stubContent({
      ...EMPTY,
      quotes: [
        { id: 'q-1', quote: 'Layanan cepat', author: 'Budi', role: 'Pembaca', media: 'Portal Uji', sortOrder: 1, active: true },
        { id: 'q-2', quote: 'Redaksi gesit', author: 'Sari', role: 'Pembaca', media: 'Portal Uji', sortOrder: 2, active: true },
      ],
    });
    render(<ContentManager />);
    expect(await screen.findByText('Budi')).toBeDefined();
    expect(screen.getByText('2 dari 2 baris')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Cari Testimoni'), { target: { value: 'Sari' } });
    expect(screen.getByText('1 dari 2 baris')).toBeDefined();
    expect(screen.queryByText('Budi')).toBeNull();
    expect(screen.getByText('Sari')).toBeDefined();
  });

  it('menampilkan baris testimoni beserta tombol simpan', async () => {
    stubContent({
      ...EMPTY,
      quotes: [
        { id: 'q-1', quote: 'Layanan cepat', author: 'Budi', role: 'Pembaca', media: 'Portal Uji', sortOrder: 1, active: true },
      ],
    });
    render(<ContentManager />);
    expect(await screen.findByText('q-1')).toBeDefined();
    expect(screen.getByDisplayValue('Layanan cepat')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDefined();
  });

  it('mengirim aksi simpan testimoni ke API', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => EMPTY }));
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({
      ...EMPTY,
      quotes: [
        { id: 'q-1', quote: 'Layanan cepat', author: 'Budi', role: 'Pembaca', media: 'Portal Uji', sortOrder: 1, active: true },
      ],
    }) } as never);
    render(<ContentManager />);
    await screen.findByRole('button', { name: 'Simpan' });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/dashboard/content',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('baris lain tetap aktif saat satu baris menyimpan', async () => {
    const bundle = {
      ...EMPTY,
      quotes: [
        { id: 'q-1', quote: 'Layanan cepat', author: 'Budi', role: 'Pembaca', media: 'Portal Uji', sortOrder: 1, active: true },
        { id: 'q-2', quote: 'Redaksi gesit', author: 'Sari', role: 'Pembaca', media: 'Portal Uji', sortOrder: 2, active: true },
      ],
    };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn(async (_url: unknown, init?: { readonly method?: string; readonly body?: string }) => {
      if (init?.method === 'POST' && (init.body ?? '').includes('Layanan cepat')) await gate;
      return { ok: true, json: async () => bundle };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ContentManager />);
    expect(await screen.findByText('Sari')).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Simpan' })[0]!);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/content', expect.objectContaining({ method: 'POST' })),
    );
    expect(screen.getAllByRole('button', { name: 'Simpan' })[0]!.hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Simpan' })[1]!.hasAttribute('disabled')).toBe(false);
    release();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Simpan' })[0]!.hasAttribute('disabled')).toBe(false),
    );
  });
});
