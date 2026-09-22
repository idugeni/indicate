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
  it('merender tab jenis konten dan tombol muat ulang', async () => {
    stubContent(EMPTY);
    render(<ContentManager />);
    expect(screen.getByRole('tab', { name: 'Testimoni' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'FAQ' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Etalase Media' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeDefined();
    expect(await screen.findByText(/Perubahan tayang segera setelah disimpan/)).toBeDefined();
  });

  it('berpindah tab aktif saat tab diklik', async () => {
    stubContent(EMPTY);
    render(<ContentManager />);
    await screen.findByText(/Perubahan tayang segera setelah disimpan/);
    fireEvent.click(screen.getByRole('tab', { name: 'FAQ' }));
    expect(screen.getByRole('tab', { name: 'FAQ' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Testimoni' }).getAttribute('aria-selected')).toBe('false');
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
});
