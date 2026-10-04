// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { GreenMinimalReportForm } from '@/modules/site/components/network/templates/green-minimal/pages/report-form';

const SITEKEY = '0x4AAAAAAFHN_lpLqmLytOD5';

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  delete window.turnstile;
  vi.resetModules();
  vi.unstubAllGlobals();
});

function setup(articleSlug: string | null = 'berita-utama', challengeSitekey: string | null = null) {
  return render(<GreenMinimalReportForm articleSlug={articleSlug} challengeSitekey={challengeSitekey} />);
}

function fillValidReport() {
  fireEvent.change(screen.getByLabelText(/kontak anda/i), { target: { value: 'warga@example.test' } });
  fireEvent.change(screen.getByLabelText(/uraian spesifik/i), { target: { value: 'Uraian yang cukup panjang untuk validasi.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui Syarat/i }));
}

async function solveChallenge(token: string) {
  const script = await waitFor(() => {
    const found = document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
    if (found === null) throw new Error('turnstile_script_missing');
    return found;
  });
  let renders = 0;
  window.turnstile = {
    render: (element, options) => {
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

describe('GreenMinimalReportForm validation', () => {
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

  it('menolak laporan tanpa persetujuan syarat dan privasi', () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup();
    fireEvent.change(screen.getByLabelText(/kontak anda/i), { target: { value: 'warga@example.test' } });
    fireEvent.change(screen.getByLabelText(/uraian spesifik/i), { target: { value: 'Uraian yang cukup panjang untuk validasi.' } });
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(screen.getByText(/centang persetujuan/i)).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('GreenMinimalReportForm submit', () => {
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
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui Syarat/i }));
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
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(await screen.findByText(/terlalu banyak laporan/i)).toBeDefined();
  });
});

describe('GreenMinimalReportForm challenge', () => {
  it('menunda skrip challenge sampai form lengkap', () => {
    setup('berita-utama', SITEKEY);
    expect(document.head.querySelector('script[src*="turnstile"]')).toBe(null);
  });

  it('mengirim token widget pada header challenge', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup('berita-utama', SITEKEY);
    fillValidReport();
    await solveChallenge('token-uji');
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/network/reports', expect.objectContaining({ method: 'POST' })));
    expect(sentHeaders(fetch)['cf-turnstile-response']).toBe('token-uji');
    expect(sentHeaders(fetch)['cf-turnstile-sitekey']).toBe(SITEKEY);
    expect(await screen.findByText(/laporan diterima/i)).toBeDefined();
  });

  it('menyarankan muat ulang verifikasi saat challenge ditolak server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 403 })));
    setup('berita-utama', SITEKEY);
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(await screen.findByText(/verifikasi keamanan gagal/i, undefined, { timeout: 6000 })).toBeDefined();
  });

  it('tetap mengirim tanpa header challenge saat tenant belum punya widget', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setup('berita-utama', null);
    fillValidReport();
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(sentHeaders(fetch)['cf-turnstile-response']).toBeUndefined();
    expect(sentHeaders(fetch)['cf-turnstile-sitekey']).toBeUndefined();
  });
});
