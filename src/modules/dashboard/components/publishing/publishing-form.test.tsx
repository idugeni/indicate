// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PublishingForm } from '@/modules/dashboard/components/publishing/publishing-form';

vi.mock('sonner', () => ({ toast: { warning: vi.fn(), info: vi.fn(), success: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const DATA = {
  articles: [{ id: 'article-1', title: 'Judul Utama', slug: 'judul-utama' }],
  sites: [
    { id: 'site-1', normalizedHostname: 'portal.example' },
    { id: 'site-2', normalizedHostname: 'berita.example' },
  ],
};

const STATUS = {
  job: { id: 'job-1', state: 'queued' },
  targets: [
    { id: 't-1', siteId: 'site-1', articleSiteId: 'as-1', state: 'published', attempt: 1, publishedUrl: 'https://portal.example/judul-utama', sanitizedError: null },
    { id: 't-2', siteId: 'site-2', articleSiteId: 'as-2', state: 'failed', attempt: 2, publishedUrl: null, sanitizedError: { code: 'boom' } },
  ],
};

function setup(command: (action: string, payload: unknown) => Promise<unknown>) {
  return render(<PublishingForm data={DATA} command={command} />);
}

describe('PublishingForm publish', () => {
  it('menerbitkan ke site tercentang dan menampilkan status', async () => {
    const command = vi.fn(async (action: string) => (action === 'publication.request' ? STATUS : null));
    setup(command);
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /kirim penerbitan/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publication.request',
      expect.objectContaining({ articleId: 'article-1', siteIds: ['site-1'], options: { mode: 'immediate' } }),
    ));
    expect(await screen.findByText(/job-1/)).toBeDefined();
    expect(screen.getByText('Terkirim')).toBeDefined();
    expect(screen.getByText('Gagal')).toBeDefined();
  });

  it('mengirim publishAt ISO UTC saat jadwal dipilih', async () => {
    const command = vi.fn(async (action: string) => (action === 'publication.request' ? STATUS : null));
    render(<PublishingForm data={{ articles: [{ id: 'scheduled-1', title: 'Berita Terjadwal', slug: 'berita-terjadwal', status: 'scheduled', scheduledAt: '2099-01-02T10:00:00.000Z' }], sites: DATA.sites }} command={command} />);
    const scheduleInput = await screen.findByLabelText('Tanggal dan waktu') as HTMLInputElement;
    fireEvent.change(scheduleInput, { target: { value: '2099-01-02T10:00' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /jadwalkan penerbitan/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publication.request',
      expect.objectContaining({
        articleId: 'scheduled-1',
        publishAt: new Date('2099-01-02T10:00').toISOString(),
        options: { mode: 'scheduled' },
      }),
    ));
  });

  it('memilih terbit sekarang untuk mengabaikan jadwal artikel', async () => {
    const command = vi.fn(async (action: string) => (action === 'publication.request' ? STATUS : null));
    render(<PublishingForm data={{ articles: [{ id: 'scheduled-1', title: 'Berita Terjadwal', slug: 'berita-terjadwal', status: 'scheduled', scheduledAt: '2099-01-02T10:00:00.000Z' }], sites: DATA.sites }} command={command} />);
    await screen.findByLabelText('Tanggal dan waktu');
    fireEvent.click(screen.getByRole('button', { name: 'Terbit sekarang' }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /kirim penerbitan/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publication.request',
      expect.objectContaining({ publishAt: null, options: { mode: 'immediate' } }),
    ));
  });

  it('meregenerasi kunci idempotensi', () => {
    setup(vi.fn(async () => null));
    const input = screen.getByLabelText(/kunci pengiriman/i) as HTMLInputElement;
    const before = input.value;
    fireEvent.click(screen.getByRole('button', { name: /regenerasi kunci/i }));
    expect(input.value).not.toBe(before);
  });

  it('mengirim override yang diisi manual', async () => {
    const command = vi.fn(async () => STATUS);
    setup(command);
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.change(screen.getAllByPlaceholderText(/judul khusus situs/i)[0]!, { target: { value: 'Judul Khusus Portal Yang Unik' } });
    fireEvent.click(screen.getByRole('button', { name: /kirim penerbitan/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publication.request',
      expect.objectContaining({ overrides: { 'site-1': { title: 'Judul Khusus Portal Yang Unik' } } }),
    ));
  });
});

describe('PublishingForm suggest and status', () => {
  it('meminta pilih artikel dan portal sebelum suggest', async () => {
    const command = vi.fn(async () => null);
    const { toast } = await import('sonner');
    render(<PublishingForm data={{ articles: [], sites: [] }} command={command} />);
    fireEvent.click(screen.getByRole('button', { name: /varian unik otomatis/i }));
    expect(toast.warning).toHaveBeenCalled();
    expect(command).not.toHaveBeenCalledWith('publication.suggest', expect.anything());
  });

  it('mengisi varian dari suggest', async () => {
    const command = vi.fn(async () => ({
      overrides: { 'site-1': { title: 'Judul Saran Unik', description: 'Deskripsi saran yang cukup panjang.' } },
    }));
    setup(command);
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /varian unik otomatis/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('publication.suggest', { articleId: 'article-1', siteIds: ['site-1'] }));
    expect((screen.getAllByPlaceholderText(/judul khusus situs/i)[0]! as HTMLInputElement).value).toBe('Judul Saran Unik');
  });

  it('memuat status via form dan mengulang yang gagal', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => (action === 'publication.status' ? STATUS : STATUS));
    setup(command);
    await user.type(screen.getByPlaceholderText(/id dari hasil pengiriman/i), 'job-1');
    await user.click(screen.getByRole('button', { name: /^muat$/i }));
    expect(await screen.findByText(/job-1/)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /ulangi yang gagal/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('publication.retry', { jobId: 'job-1' }), { timeout: 5000 });
  });

  it('menarik yang tayang hanya setelah konfirmasi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => STATUS);
    setup(command);
    await user.type(screen.getByPlaceholderText(/id dari hasil pengiriman/i), 'job-1');
    await user.click(screen.getByRole('button', { name: /^muat$/i }));
    expect(await screen.findByText(/job-1/)).toBeDefined();

    vi.stubGlobal('confirm', vi.fn(() => false));
    await user.click(screen.getByRole('button', { name: /tarik yang tayang/i }));
    expect(command).not.toHaveBeenCalledWith('publication.unpublish', expect.anything());

    vi.stubGlobal('confirm', vi.fn(() => true));
    await user.click(screen.getByRole('button', { name: /tarik yang tayang/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('publication.unpublish', { jobId: 'job-1' }), { timeout: 5000 });
  });

  it('menampilkan galat status yang ramah', async () => {
    setup(vi.fn(async () => null));
    fireEvent.change(screen.getByPlaceholderText(/id dari hasil pengiriman/i), { target: { value: 'job-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^muat$/i }));
    expect(await screen.findByText(/tidak dapat dimuat/)).toBeDefined();
  });

  it('mengubah indeksasi kopi tayang hanya setelah konfirmasi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => {
      if (action === 'publication.setSiteRobots') return { articleSiteId: 'as-1', directive: 'noindex,nofollow', version: 2 };
      return STATUS;
    });
    setup(command);
    await user.type(screen.getByPlaceholderText(/id dari hasil pengiriman/i), 'job-1');
    await user.click(screen.getByRole('button', { name: /^muat$/i }));
    expect(await screen.findByText(/job-1/)).toBeDefined();

    vi.stubGlobal('confirm', vi.fn(() => false));
    await user.click(screen.getByRole('button', { name: /^nonindeks$/i }));
    expect(command).not.toHaveBeenCalledWith('publication.setSiteRobots', expect.anything());

    vi.stubGlobal('confirm', vi.fn(() => true));
    await user.click(screen.getByRole('button', { name: /^nonindeks$/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('publication.setSiteRobots', { articleSiteId: 'as-1', directive: 'noindex' }), { timeout: 5000 });
  });
});
