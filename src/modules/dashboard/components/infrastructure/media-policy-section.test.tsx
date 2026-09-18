// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MediaPolicySection } from '@/modules/dashboard/components/infrastructure/media-policy-section';

const KEBIJAKAN = {
  policy: {
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxObjectBytes: 5 * 1024 * 1024,
    uploadAuthorizationSeconds: 300,
    readAuthorizationSeconds: 60,
    version: 3,
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Seksi kebijakan media', () => {
  it('menampilkan pesan grant saat API menolak', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 404, ok: false, json: async () => ({}) })));
    render(<MediaPolicySection />);
    expect(
      await screen.findByText('Panel ini membutuhkan grant platform.runtime_config.manage.'),
    ).toBeDefined();
  });

  it('merender formulir dari kebijakan yang dimuat', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => KEBIJAKAN })));
    render(<MediaPolicySection />);
    expect(await screen.findByText(/Tipe diizinkan: image\/jpeg, image\/png/)).toBeDefined();
    expect(screen.getByLabelText('Maks objek (MB)')).toBeDefined();
    expect(screen.getByLabelText('TTL URL unggah (detik)')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Simpan kebijakan media' })).toBeDefined();
  });

  it('menolak nilai yang tidak positif tanpa memanggil API', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => KEBIJAKAN }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPolicySection />);
    await screen.findByRole('button', { name: 'Simpan kebijakan media' });
    fetchMock.mockClear();
    fireEvent.change(screen.getByLabelText('Maks objek (MB)'), { target: { value: '-5' } });
    fireEvent.submit(screen.getByLabelText('Maks objek (MB)').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Nilai harus angka positif; TTL dalam detik bulat.')).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menyimpan kebijakan dan menampilkan pemberitahuan', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({}) };
      return { ok: true, json: async () => KEBIJAKAN };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaPolicySection />);
    await screen.findByRole('button', { name: 'Simpan kebijakan media' });
    fireEvent.submit(screen.getByLabelText('Maks objek (MB)').closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/dashboard/runtime-config',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByText('Kebijakan media tersimpan dan beraudit.')).toBeDefined();
  });
});
