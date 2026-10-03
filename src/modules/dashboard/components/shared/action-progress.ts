'use client';

import { toast } from 'sonner';

/**
 * Satu toast yang berjalan sepanjang satu tindakan pengguna.
 *
 * @remarks Dashboard mengirim banyak perintah untuk satu klik (satu unggah
 * = reserve → complete, satu publish = N batch). Kalau tiap perintah
 * melapor sendiri, satu tindakan jadi tumpukan toast dan pemuatan ulang.
 * Handles ini mengikat semua laporan ke satu `id`, jadi progres bisa
 * diperbarui, ditutup, atau dibatalkan tanpa menambah toast baru.
 */
export interface ActionProgress {
  /** Perbarui teks progres pada toast yang sama. */
  readonly step: (message: string) => void;
  /** Tutup progres sebagai berhasil. */
  readonly succeed: (message: string) => void;
  /** Tutup progres sebagai gagal. */
  readonly fail: (message: string) => void;
}

/**
 * Buka satu toast progres untuk satu tindakan pengguna.
 *
 * @param loading - Teks yang tampil saat tindakan berjalan.
 * @returns Handle untuk memperbarui dan menutup toast tersebut.
 *
 * @example
 * ```ts
 * const progress = beginActionProgress('Mengunggah gambar…');
 * progress.step('Memverifikasi berkas…');
 * progress.succeed('Gambar tersimpan.');
 * ```
 */
export function beginActionProgress(loading: string): ActionProgress {
  // Owning the id (rather than taking sonner's return value) keeps every update
  // and the final result pinned to one toast, and makes that guarantee
  // assertable instead of implied by library behaviour.
  const id = `aksi-${crypto.randomUUID()}`;
  toast.loading(loading, { id });
  return {
    step: (message) => {
      toast.loading(message, { id });
    },
    succeed: (message) => {
      toast.success(message, { id });
    },
    fail: (message) => {
      toast.error(message, { id });
    },
  };
}
