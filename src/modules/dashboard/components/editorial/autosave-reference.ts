import type { AutosavedDraft } from '@/modules/dashboard/components/editorial/article-persistence';

/**
 * Rujukan draft yang tersimpan di server, untuk Autosave lintas muatan halaman.
 *
 * Tanpa penyimpanan rujukan ini, `autosavedDraft` kembali menjadi `null` setiap
 * kali halaman dimuat dan autosave memanggil `article.create` lagi. Akibatnya
 * setiap muatan halaman menghasilkan baris draf duplikat alih-alih memperbarui
 * draf yang sama, dan tidak ada satu pun yang bisa dijadikan target pemulihan.
 */
const STORAGE_PREFIX = 'indicate:article-autosave-ref';

function storageKey(organizationId: string): string {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

/**
 * Baca rujukan draft autosave milik satu organisasi.
 *
 * @param organizationId - Id tenant; rujukan tidak pernah lintas tenant.
 * @returns Rujukan bila ada dan masih berbentuk sama; null bila tidak ada atau rusak.
 * @remarks Membaca `localStorage` harus lewat efek mount, bukan initializer
 * `useState`: penyimpanan browser tidak ada saat SSR, jadi initializer akan
 * membaca `null` di server dan nilai tersimpan di klien, dan itu menghasilkan
 * hydration mismatch.
 */
export function readAutosaveReference(organizationId: string): AutosavedDraft | null {
  if (typeof window === 'undefined' || organizationId === '') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(organizationId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<AutosavedDraft> | null;
    if (parsed === null || typeof parsed !== 'object') return null;
    if (typeof parsed.id !== 'string' || parsed.id === '') return null;
    return {
      id: parsed.id,
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      slug: typeof parsed.slug === 'string' ? parsed.slug : '',
    };
  } catch {
    return null;
  }
}

/**
 * Simpan rujukan draft autosave milik satu organisasi.
 *
 * @param organizationId - Id tenant pemilik draft.
 * @param reference - Rujukan hasil autosave terakhir yang berhasil.
 * @returns True bila tersimpan; false bila storage ditolak browser.
 * @remarks Kegagalan menulis sengaja ditelan, sama seperti cermin draf: autosave
 * ke server tetap berjalan dan rujukan lama masih berlaku.
 */
export function writeAutosaveReference(organizationId: string, reference: AutosavedDraft): boolean {
  if (typeof window === 'undefined' || organizationId === '') return false;
  try {
    window.localStorage.setItem(storageKey(organizationId), JSON.stringify(reference));
    return true;
  } catch {
    return false;
  }
}

/**
 * Hapus rujukan draft autosave milik satu organisasi.
 *
 * @param organizationId - Id tenant pemilik draft.
 * @returns Nothing; kegagalan penghapusan ditelan tanpa mengganggu komposer.
 * @remarks Dipanggil setelah artikel tersimpan, supaya artikel berikutnya tidak
 * memperbarui draf lama yang sudah selesai.
 */
export function clearAutosaveReference(organizationId: string): void {
  if (typeof window === 'undefined' || organizationId === '') return;
  try {
    window.localStorage.removeItem(storageKey(organizationId));
  } catch {
    // Penyimpanan bisa dinonaktifkan di tengah sesi; penulisan berikutnya
    // akan menimpanya atau ditolak.
  }
}
