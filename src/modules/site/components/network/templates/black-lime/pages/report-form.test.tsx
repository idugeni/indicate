// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BlackLimeReportForm } from '@/modules/site/components/network/templates/black-lime/pages/report-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(articleSlug: string | null = 'berita-utama') {
  return render(<BlackLimeReportForm articleSlug={articleSlug} />);
}

describe('BlackLimeReportForm validation', () => {
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

describe('BlackLimeReportForm submit', () => {
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
