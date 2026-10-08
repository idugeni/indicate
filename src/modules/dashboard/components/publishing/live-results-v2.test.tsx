// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LiveResultsV2 } from '@/modules/dashboard/components/publishing/live-results-v2';

afterEach(() => cleanup());

const DATA = {
  total: 2,
  articles: [
    { id: 'a-1', title: 'Berita Pertama', slug: 'berita-pertama', publishedAt: '2026-10-08T10:00:00Z', publishedUrls: ['https://portal-a.example/berita-pertama'] },
    { id: 'a-2', title: 'Berita Kedua', slug: 'berita-kedua', publishedAt: '2026-10-08T09:00:00Z', publishedUrls: ['https://portal-b.example/berita-kedua'] },
  ],
};

describe('LiveResultsV2', () => {
  it('menampilkan control tower dan hasil terbaru', () => {
    render(<LiveResultsV2 data={DATA} organizationId="org-1" />);
    expect(screen.getByText('Live Results Control Tower')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Live Results', level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Berita Pertama' }).length).toBeGreaterThan(0);
    expect(screen.getByText('https://portal-a.example/berita-pertama')).toBeTruthy();
  });

  it('tidak melakukan polling readiness secara otomatis', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ready: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<LiveResultsV2 data={DATA} organizationId="org-1" />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('melakukan readiness check hanya saat diminta', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ready: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<LiveResultsV2 data={DATA} organizationId="org-1" />);
    const checkButtons = screen.getAllByRole('button', { name: 'Cek preview' });
    expect(checkButtons.length).toBeGreaterThan(0);
    fireEvent.click(checkButtons[0]!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('button', { name: 'Preview siap' }).length).toBeGreaterThan(0);
  });
});
