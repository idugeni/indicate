// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AdsManagementPanel } from '@/modules/dashboard/components/ads/ads-management-panel';

const OVERVIEW = {
  sites: [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Portal Contoh', hostname: 'portal.example', templateId: 'clean-blue' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Portal Kedua', hostname: 'kedua.example', templateId: 'clean-blue' },
  ],
  slots: [],
  settings: [],
  advertisers: [{ id: 'adv-1', name: 'Pengiklan Bagus' }],
  campaigns: [],
  creatives: [{ id: 'cre-1', campaignId: null, kind: 'image', imageUrl: 'https://cdn.example/a.png', href: null, altText: 'Promo', html: null, provider: null, status: 'active', version: 1 }],
  placements: [],
};

describe('AdsManagementPanel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('menampilkan slot jaringan yang berlaku untuk semua situs tanpa tab terpisah', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => OVERVIEW })));
    render(<AdsManagementPanel organizationId="org-1" />);
    await waitFor(() => expect(screen.getByText('Banner Papan Skor')).toBeDefined());
    expect(screen.getByText(/Berlaku untuk 2 situs/)).toBeDefined();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Ubah slot ini/ })).toHaveLength(14);
  });

  it('membuka editor terpusat dengan seluruh sumber konten dalam satu tempat', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => OVERVIEW })));
    render(<AdsManagementPanel organizationId="org-1" />);
    await waitFor(() => expect(screen.getByText('Banner Papan Skor')).toBeDefined());
    const card = screen.getByRole('article', { name: 'Banner Papan Skor' });
    await user.click(within(card).getByRole('button', { name: /Ubah slot ini/ }));
    expect(await within(card).findByText('Sumber konten iklan')).toBeDefined();
    for (const source of ['Dari pustaka', 'URL gambar', 'Unggah gambar', 'Kode HTML / skrip', 'Google AdSense']) {
      expect(within(card).getByText(source)).toBeDefined();
    }
    expect(within(card).getByRole('button', { name: 'Simpan slot ini' })).toBeDefined();
  });

  it('menyimpan draft slot ke seluruh situs hanya saat tombol Simpan ditekan', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: unknown, _init?: { readonly method?: string; readonly body?: string }) => {
      if (typeof url === 'string' && url.includes('scope=overview')) return { ok: true, json: async () => OVERVIEW };
      return { ok: true, json: async () => ({ creativeId: null, savedSites: 2 }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdsManagementPanel organizationId="org-1" />);
    await waitFor(() => expect(screen.getByText('Banner Papan Skor')).toBeDefined());
    const card = screen.getByRole('article', { name: 'Banner Papan Skor' });
    await user.click(within(card).getByRole('button', { name: /Ubah slot ini/ }));
    await user.click(within(card).getByRole('switch', { name: /Aktifkan slot.*di semua situs/ }));
    await user.click(within(card).getByRole('radio', { name: /URL gambar/ }));
    await user.type(within(card).getByLabelText('URL gambar'), 'https://cdn.example/promo.png');
    await user.click(within(card).getByRole('button', { name: 'Simpan slot ini' }));
    await waitFor(() => expect(screen.getByText(/tersimpan dan berlaku untuk seluruh situs jaringan/)).toBeDefined());
    const saved = fetchMock.mock.calls.find((call) => {
      const body = typeof call[1]?.body === 'string' ? call[1].body as string : '';
      return body.includes('ads.network_setting.save');
    });
    expect(saved).toBeDefined();
  });

  it('menampilkan kesalahan saat API gagal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    render(<AdsManagementPanel organizationId="org-1" />);
    await waitFor(() => expect(screen.getByText('Gagal memuat data iklan.')).toBeDefined());
  });
});
