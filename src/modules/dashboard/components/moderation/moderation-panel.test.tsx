// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ModerationPanel } from '@/modules/dashboard/components/moderation/moderation-panel';

function stubModeration(reports: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({}) };
      const urlString = String(url);
      if (urlString.includes('scope=reports')) return { ok: true, json: async () => reports };
      return { ok: true, json: async () => [] };
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Panel moderasi', () => {
  it('merender semua seksi dengan status kosong', async () => {
    stubModeration();
    render(<ModerationPanel organizationId="org-1" />);
    expect(screen.getByText('Laporan konten publik')).toBeDefined();
    expect(screen.getByText('Permintaan data baru')).toBeDefined();
    expect(screen.getByText('Tiket permintaan (SLA 30 hari)')).toBeDefined();
    expect(screen.getByText('Tunda hapus resmi')).toBeDefined();
    expect(screen.getByText('Hapus data organisasi')).toBeDefined();
    expect(await screen.findByText('Belum ada laporan konten.')).toBeDefined();
    expect(await screen.findByText('Belum ada penundaan.')).toBeDefined();
    expect(await screen.findByText('Belum ada permintaan hapus data.')).toBeDefined();
  });

  it('menolak permintaan data dengan uraian pendek', async () => {
    stubModeration();
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText('Belum ada laporan konten.');
    fireEvent.change(screen.getByLabelText('Uraian permintaan data'), { target: { value: 'pendek' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    expect(await screen.findByText('Uraian permintaan minimal 10 karakter.')).toBeDefined();
  });

  it('menolak penundaan tanpa alasan yang cukup', async () => {
    stubModeration();
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText('Belum ada laporan konten.');
    fireEvent.click(screen.getByRole('button', { name: 'Tahan hapus' }));
    expect(await screen.findByText('Isi ID organisasi dan alasan penundaan (min. 10 karakter).')).toBeDefined();
  });

  it('menolak hapus data tanpa isian yang cukup', async () => {
    stubModeration();
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText('Belum ada laporan konten.');
    fireEvent.click(screen.getByRole('button', { name: 'Minta hapus data' }));
    expect(await screen.findByText('Isi ID organisasi dan alasan hapus data (min. 10 karakter).')).toBeDefined();
  });

  it('menandai laporan sudah ditindak setelah konfirmasi', async () => {
    stubModeration([
      {
        id: 'rep-1',
        orgId: 'org-1',
        siteId: null,
        articleId: null,
        reporterContact: 'pelapor@contoh.id',
        reasonCategory: 'spam-tidak-terdaftar',
        details: 'Detail laporan uji coba moderasi',
        articleUrl: null,
        status: 'received',
        createdAt: '2026-09-01',
      },
    ]);
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText(/Detail laporan uji coba moderasi/);
    fireEvent.click(screen.getByRole('button', { name: 'Sudah ditindak' }));
    expect(await screen.findByText('Laporan ditandai sudah ditindak.')).toBeDefined();
  });
});
