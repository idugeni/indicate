// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdsControlCenterV2 } from './ads-control-center-v2';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const overview = {
  sites: [
    { id: 'site-1', name: 'Portal Contoh', hostname: 'portal.example', templateId: 'clean-blue' },
  ],
  slots: [
    { id: 'leaderboard', name: 'Leaderboard', description: 'Banner', active: true },
    { id: 'sidebar-top', name: 'Sidebar top', description: 'Sidebar', active: true },
  ],
  settings: [
    {
      siteId: 'site-1',
      slotId: 'leaderboard',
      enabled: true,
      creativeId: 'creative-1',
      version: 1,
    },
  ],
  advertisers: [],
  campaigns: [
    { id: 'campaign-1', name: 'Promo Oktober', status: 'active', startsAt: null, endsAt: null },
  ],
  creatives: [{ id: 'creative-1', campaignId: 'campaign-1', kind: 'image', status: 'active' }],
  placements: [],
};

function stubFetch(body: unknown = overview, ok = true) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).length === 0 || init?.method === 'POST')
      throw new Error('Unexpected request');
    return { ok, status: ok ? 200 : 503, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Ads Control Center V2', () => {
  it('summarizes slot readiness and surfaces active campaigns without active placements', async () => {
    const fetchMock = stubFetch();
    render(<AdsControlCenterV2 organizationId="org-1" />);
    expect(await screen.findByRole('heading', { name: 'Ads Control Center' })).toBeDefined();
    expect(await screen.findByText('Campaign aktif tanpa placement aktif')).toBeDefined();
    expect(await screen.findByRole('article', { name: 'Leaderboard' })).toBeDefined();
    expect((await screen.findByRole('article', { name: 'Leaderboard' })).textContent).toContain(
      'Siap',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('organizationId=org-1&scope=overview');
  });

  it('filters the bounded slot catalog without another API request', async () => {
    const fetchMock = stubFetch();
    render(<AdsControlCenterV2 organizationId="org-1" />);
    await screen.findByRole('heading', { name: 'Ads Control Center' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari slot' }), {
      target: { value: 'sidebar' },
    });
    expect(await screen.findByRole('article', { name: 'Sidebar top' })).toBeDefined();
    expect(screen.queryByRole('article', { name: 'Leaderboard' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows a safe retry path when the overview endpoint fails', async () => {
    stubFetch({}, false);
    render(<AdsControlCenterV2 organizationId="org-1" />);
    expect(await screen.findByText(/Ringkasan iklan gagal dimuat/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Muat ulang/ })).toBeDefined();
  });

  it('keeps full mutation controls behind an explicit action', async () => {
    stubFetch();
    render(<AdsControlCenterV2 organizationId="org-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Konfigurasi lanjutan/ }));
    expect(await screen.findByRole('heading', { name: 'Konfigurasi iklan lengkap' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Kembali ke Control Center/ })).toBeDefined();
  });

  it('does not invent coverage when no sites exist', async () => {
    stubFetch({
      ...overview,
      sites: [],
      settings: [],
      campaigns: [],
      creatives: [],
      placements: [],
    });
    render(<AdsControlCenterV2 organizationId="org-1" />);
    expect((await screen.findAllByText('Belum ada situs')).length).toBeGreaterThan(0);
  });
});
