// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ContentManager } from '@/modules/dashboard/components/content/content-manager';

function stubKonten(bundle: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => bundle })),
  );
}

const KOSONG = { quotes: [], faqRows: [], showcase: [], channels: [], templates: [] };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Pengelola konten dinamis', () => {
  it('merender tab jenis konten dan tombol muat ulang', async () => {
    stubKonten(KOSONG);
    render(<ContentManager />);
    expect(screen.getByRole('button', { name: 'Testimoni' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'FAQ' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Etalase Media' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeDefined();
    expect(await screen.findByText(/Perubahan tayang segera setelah disimpan/)).toBeDefined();
  });

  it('berpindah tab aktif saat tab diklik', async () => {
    stubKonten(KOSONG);
    render(<ContentManager />);
    await screen.findByText(/Perubahan tayang segera setelah disimpan/);
    fireEvent.click(screen.getByRole('button', { name: 'FAQ' }));
    expect(screen.getByRole('button', { name: 'FAQ' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Testimoni' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('menampilkan baris testimoni beserta tombol simpan', async () => {
    stubKonten({
      ...KOSONG,
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
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => KOSONG }));
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({
      ...KOSONG,
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
