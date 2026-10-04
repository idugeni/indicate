// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { AdsManagementPanel } from '@/modules/dashboard/components/ads/ads-management-panel';

const OVERVIEW = {
  sites: [{ id: 'site-1', name: 'Portal Contoh', hostname: 'portal.example', templateId: 'clean-blue' }],
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

  it('memuat ringkasan dan menampilkan slot situs terpilih', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => OVERVIEW })));
    render(<AdsManagementPanel organizationId="org-1" />);
    await waitFor(() => expect(screen.getByText('Portal Contoh · portal.example')).toBeDefined());
    for (const tab of ['Slot Situs', 'Kampanye', 'Kreatif', 'Penempatan']) {
      expect(screen.getByRole('tab', { name: tab })).toBeDefined();
    }
  });

  it('menampilkan kesalahan saat API gagal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    render(<AdsManagementPanel organizationId="org-1" />);
    await waitFor(() => expect(screen.getByText('Gagal memuat data iklan.')).toBeDefined());
  });
});
