// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ModerationPanel } from '@/modules/dashboard/components/moderation/moderation-panel';

function stubModerasi(laporan: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({}) };
      const alamat = String(url);
      if (alamat.includes('scope=reports')) return { ok: true, json: async () => laporan };
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
    stubModerasi();
    render(<ModerationPanel organizationId="org-1" />);
    expect(screen.getByText('Laporan konten publik')).toBeDefined();
    expect(screen.getByText('Permintaan data baru (DSAR)')).toBeDefined();
    expect(screen.getByText('Tiket DSAR (SLA 30 hari)')).toBeDefined();
    expect(screen.getByText('Litigation hold (tunda hapus resmi)')).toBeDefined();
    expect(screen.getByText('Erasure organisasi penuh')).toBeDefined();
    expect(await screen.findByText('Belum ada laporan konten.')).toBeDefined();
    expect(await screen.findByText('Belum ada hold.')).toBeDefined();
    expect(await screen.findByText('Belum ada permintaan erasure.')).toBeDefined();
  });

  it('menolak permintaan data dengan uraian pendek', async () => {
    stubModerasi();
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText('Belum ada laporan konten.');
    fireEvent.change(screen.getByLabelText('Uraian permintaan data'), { target: { value: 'pendek' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    expect(await screen.findByText('Uraian permintaan minimal 10 karakter.')).toBeDefined();
  });

  it('menolak hold tanpa alasan yang cukup', async () => {
    stubModerasi();
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText('Belum ada laporan konten.');
    fireEvent.click(screen.getByRole('button', { name: 'Tahan hapus' }));
    expect(await screen.findByText('Isi UUID organisasi dan alasan hold (min. 10 karakter).')).toBeDefined();
  });

  it('menolak erasure tanpa isian yang cukup', async () => {
    stubModerasi();
    render(<ModerationPanel organizationId="org-1" />);
    await screen.findByText('Belum ada laporan konten.');
    fireEvent.click(screen.getByRole('button', { name: 'Minta erasure' }));
    expect(await screen.findByText('Isi UUID organisasi dan alasan erasure (min. 10 karakter).')).toBeDefined();
  });

  it('menandai laporan sudah ditindak setelah konfirmasi', async () => {
    stubModerasi([
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
