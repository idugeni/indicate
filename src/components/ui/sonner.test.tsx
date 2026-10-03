// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

import { Toaster } from '@/components/ui/sonner';

afterEach(() => {
  cleanup();
  toast.dismiss();
});

/**
 * Menunggu toast yang pesannya persis `message`.
 *
 * Sonner menyisipkan toast baru di depan antrean dan merender lewat
 * `flushSync` dalam callback subscription, jadi menebak indeks atau sekadar
 * fakta bahwa "ada toast" bisa membaca toast lama milik langkah sebelumnya.
 */
async function findToast(message: string): Promise<HTMLElement> {
  return waitFor(() => {
    const match = [...document.querySelectorAll<HTMLElement>('[data-sonner-toast]')].find(
      (el) => el.querySelector('[data-title]')?.textContent === message,
    );
    expect(match, `toast untuk "${message}" belum dirender`).toBeTruthy();
    return match!;
  });
}

describe('Pemberi roti panggang', () => {
  it('merender daerah notifikasi dalam bahasa antarmuka', () => {
    const { container } = render(<Toaster />);
    expect(container.querySelector('section[aria-label^="Notifikasi"]')).not.toBe(null);
  });

  it('merender daerah notifikasi posisi atas', () => {
    const { container } = render(<Toaster position="top-center" />);
    expect(container.querySelector('section[aria-label^="Notifikasi"]')).not.toBe(null);
  });

  it('menampilkan pesan lengkap, bukan ringkasan', async () => {
    render(<Toaster />);
    toast.success('Jumlah tayang tersimpan untuk 3 situs.');

    const toastEl = await findToast('Jumlah tayang tersimpan untuk 3 situs.');
    expect(toastEl.querySelector('[data-title]')?.textContent).toBe('Jumlah tayang tersimpan untuk 3 situs.');
  });

  // Warna saja tidak memenuhi WCAG 1.4.1; tiap status harus punya bentuk ikon sendiri.
  it('memberi setiap status bentuk ikon sendiri, bukan hanya warna', async () => {
    render(<Toaster />);

    const cases = [
      { type: 'success', message: 'Kategori "Berita" berhasil dibuat.', report: toast.success },
      { type: 'error', message: 'Perubahan status artikel gagal.', report: toast.error },
      { type: 'warning', message: 'Waktu publish harus berada di masa depan.', report: toast.warning },
      { type: 'info', message: 'Sebagian saran di luar daftar.', report: toast.info },
    ] as const;

    for (const { type, message, report } of cases) {
      report(message);
      const toastEl = await findToast(message);

      expect(toastEl.dataset.type).toBe(type);
      expect(toastEl.querySelector('[data-icon] svg')).not.toBe(null);
    }
  });

  it('memberi galat hierarki sendiri: tombolnya tidak disembunyikan sampai hover', async () => {
    render(<Toaster />);

    toast.error('Perubahan status artikel gagal.');
    const failure = await findToast('Perubahan status artikel gagal.');
    toast.success('Artikel diarsipkan.');
    const receipt = await findToast('Artikel diarsipkan.');

    // Pembedanya ada di elemen toast sesuai tipenya, bukan di tombolnya: tombol
    // selalu membawa `opacity-0` bersama varian hover/fokus yang sama.
    expect(failure.className).toContain('[&_[data-title]]:font-medium');
    expect(failure.className).toContain('[&_[data-close-button]]:opacity-100');
    expect(receipt.className).not.toContain('[&_[data-title]]:font-medium');
    expect(receipt.className).not.toContain('[&_[data-close-button]]:opacity-100');
  });

  it('menyamakan tombol tutup dengan label yang terbaca pembaca layar', async () => {
    render(<Toaster />);
    toast.error('Kunci API gagal diterbitkan.');

    const toastEl = await findToast('Kunci API gagal diterbitkan.');
    expect(toastEl.querySelector('[data-close-button]')?.getAttribute('aria-label')).toBe('Tutup notifikasi');
  });
});