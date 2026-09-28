// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SoftBlueReportForm } from '@/modules/site/components/network/templates/soft-blue/pages/report-form';

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  delete window.turnstile;
  vi.resetModules();
  vi.unstubAllGlobals();
});

function setup(articleSlug: string | null = 'berita-utama') {
  return render(<SoftBlueReportForm articleSlug={articleSlug} />);
}

function fillValidReport() {
  fireEvent.change(screen.getByLabelText(/kontak anda/i), { target: { value: 'warga@example.test' } });
  fireEvent.change(screen.getByLabelText(/uraian spesifik/i), { target: { value: 'Uraian yang cukup panjang untuk validasi.' } });
}

async function solveChallenge(token: string) {
  const script = document.head.querySelector('script[src*="turnstile"]');
  if (script === null) throw new Error('turnstile_script_missing');
  let renders = 0;
  window.turnstile = {
    render: (_element, options) => {
      renders += 1;
      options.callback(token);
      return 'widget-1';
    },
    remove: () => {},
  };
  script.dispatchEvent(new Event('load'));
  await waitFor(() => expect(renders).toBe(1));
}

function sentHeaders(fetch: ReturnType<typeof vi.fn>): Record<string, string> {
  const call = fetch.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
  return call[1].headers;
}

describe('SoftBlueReportForm validation', () => {
  it('menolak submit dengan kontak dan uraian pendek', () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(screen.getByText(/lengkapi kontak dan uraian/i)).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('menyembunyikan baris artikel saat slug null', () => {
    setup(null);
    expect(screen.queryByText(/artikel:/i)).toBe(null);
  });
});

describe('SoftBlueReportForm submit', () => {
  it('mengirim laporan valid dan menampilkan terima kasih', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup();
    fireEvent.change(screen.getByLabelText(/kontak anda/i), { target: { value: 'warga@example.test' } });
    const trigger = screen.getByRole('combobox', { name: /kategori pelanggaran/i });
    fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Misinformasi / hoaks' });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    expect(trigger.textContent).toMatch(/misinformasi \/ hoaks/i);
    fireEvent.change(screen.getByLabelText(/uraian spesifik/i), { target: { value: 'Paragraf kedua memuat klaim tanpa sumber yang jelas.' } });
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/network/reports',
      expect.objectContaining({ method: 'POST' }),
    ));
    const call = fetch.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(call[1].body)).toMatchObject({ articleSlug: 'berita-utama', category: 'misinformation' });
    expect(await screen.findByText(/laporan diterima/i)).toBeDefined();
  });

  it('menampilkan galat ramah saat server menolak', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 429 })));
    setup();
    fireEvent.change(screen.getByLabelText(/kontak anda/i), { target: { value: 'warga@example.test' } });
    fireEvent.change(screen.getByLabelText(/uraian spesifik/i), { target: { value: 'Uraian yang cukup panjang untuk validasi.' } });
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(await screen.findByText(/terlalu banyak laporan/i)).toBeDefined();
  });
});

describe('SoftBlueReportForm challenge', () => {
  it('mengirim token widget pada header challenge', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup();
    await solveChallenge('token-uji');
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/network/reports', expect.objectContaining({ method: 'POST' })));
    expect(sentHeaders(fetch)['cf-turnstile-response']).toBe('token-uji');
    expect(await screen.findByText(/laporan diterima/i)).toBeDefined();
  });

  it('menyarankan muat ulang verifikasi saat challenge ditolak server', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 403 })));
    setup();
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(await screen.findByText(/verifikasi keamanan gagal/i)).toBeDefined();
  });

  it('tetap mengirim tanpa header challenge saat widget tidak dikonfigurasi', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup();
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(sentHeaders(fetch)['cf-turnstile-response']).toBeUndefined();
  });
});
