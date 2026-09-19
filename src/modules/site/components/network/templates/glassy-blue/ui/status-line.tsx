/**
 * Pengumuman jumlah artikel untuk pembaca layar.
 *
 * @param count - Jumlah artikel tampil.
 * @param title - Judul konteks halaman.
 * @returns Elemen status aksesibel.
 */
export function GlassyBlueStatusLine({ count, title }: { readonly count: number; readonly title: string }) {
  return (
    <p className="sr-only" role="status">
      {count === 0 ? `Tidak ada artikel pada ${title}.` : `Menampilkan ${count} artikel pada ${title}.`}
    </p>
  );
}
