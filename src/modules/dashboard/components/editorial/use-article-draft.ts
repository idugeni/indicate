import { useCallback, useEffect, useRef } from 'react';

import type { CategoryEntity } from '@/modules/dashboard/components/shared/types';

/** Versi bentuk data; naik bila bentuk `ArticleDraft` berubah agar draft lama dibuang, bukan disalin salah. */
const DRAFT_VERSION = 1;
const STORAGE_PREFIX = 'indicate:article-draft';
const WRITE_DEBOUNCE_MS = 800;

/**
 * Isian form artikel yang dipulihkan setelah tab dimuat ulang.
 *
 * @remarks `bodyJson` disimpan apa adanya. Skema server tetap memvalidasi
 * ulang saat submit atau autosave, jadi draft yang rusak hanya menghasilkan
 * pesan validasi, bukan data yang lolos ke database.
 */
export interface ArticleDraft {
  readonly version: number;
  readonly savedAt: string;
  readonly slug: string;
  readonly slugTouched: boolean;
  readonly status: string;
  readonly categoryIds: readonly string[];
  readonly extraCategories: readonly CategoryEntity[];
  readonly publisherId: string | null;
  readonly authorId: string | null;
  readonly provinceId: string | null;
  readonly cityId: string | null;
  readonly titleText: string;
  readonly descriptionText: string;
  readonly bodyText: string;
  readonly bodyJson: unknown;
  readonly source: string;
  readonly canonicalUrl: string;
  readonly coverUrl: string;
  readonly tags: readonly string[];
  readonly publishOnSave: boolean;
}

function storageKey(organizationId: string): string {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

/**
 * Baca draft artikel milik satu organisasi.
 *
 * @param organizationId - Id tenant; kunci draft tidak pernah lintas tenant.
 * @returns Draft bila ada dan masih berbentuk sama; null bila tidak ada, kedaluwarsa, atau rusak.
 */
export function readArticleDraft(organizationId: string): ArticleDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(organizationId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<ArticleDraft> | null;
    if (parsed === null || typeof parsed !== 'object') return null;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (typeof parsed.titleText !== 'string' || typeof parsed.bodyText !== 'string') return null;
    return parsed as ArticleDraft;
  } catch {
    return null;
  }
}

/**
 * Simpan draft artikel milik satu organisasi.
 *
 * @param organizationId - Id tenant pemilik draft.
 * @param draft - Isian form yang sedang disusun.
 * @returns True bila tersimpan; false bila storage penuh atau ditolak browser.
 * @remarks Kegagalan menulis sengaja ditelan. Draft browser adalah jaring
 * pengaman, bukan sumber kebenaran; lapisan autosave server yang menjamin
 * durability, jadi kuota penuh tidak boleh menggagalkan komposisi.
 */
export function writeArticleDraft(organizationId: string, draft: ArticleDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(storageKey(organizationId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Hapus draft artikel milik satu organisasi.
 *
 * @param organizationId - Id tenant pemilik draft.
 * @returns Nothing; kegagalan penghapusan ditelan tanpa mengganggu komposer.
 */
export function clearArticleDraft(organizationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(organizationId));
  } catch {
    // Penyimpanan bisa dinonaktifkan di tengah sesi; draft yang tertinggal akan
    // ditimpa atau ditolak pada percobaan berikutnya.
  }
}

/**
 * Cermin state form ke `localStorage` dengan penundaan, dan hapus saat form dibersihkan.
 *
 * @param organizationId - Id tenant; draft tidak pernah disimpan lintas tenant.
 * @param draft - Nilai form saat ini; `null` membatalkan penulisan dan menghapus draft.
 * @returns Fungsi `cancel` untuk membatalkan penundaan yang masih berjalan.
 * @remarks Nilai disnapshot lewat ref supaya perubahan tiap ketikan tidak
 * membuat ulang timer. Penghapusan juga dijeda, bukan langsung, supaya efek
 * pemulihan yang berjalan lebih dulu di mount selalu sempat membaca draft
 * sebelum cermin membersihkannya.
 * @remarks `draft: null` berarti form kosong, jadi draft lama harus dibuang.
 */
export function useArticleDraftMirror(organizationId: string, draft: ArticleDraft | null): () => void {
  const latest = useRef<ArticleDraft | null>(draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const cancel = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    cancel();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (draft === null) clearArticleDraft(organizationId);
      else writeArticleDraft(organizationId, { ...latest.current!, savedAt: new Date().toISOString() });
    }, WRITE_DEBOUNCE_MS);
    return cancel;
  }, [organizationId, draft, cancel]);

  useEffect(() => cancel, [cancel]);

  return cancel;
}
