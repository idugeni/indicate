import type { ReactNode } from 'react';

/**
 * Penampung konten selebar contoh (max-6xl) yang juga mengisi tinggi
 * `main` agar halaman dengan status kosong bisa memusatkan isinya.
 *
 * @param children - Isi halaman.
 * @param className - Tambahan kelas utilitas.
 * @returns Kontainer tenant.
 */
export function SoftBlueContainer({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
  return <div className={`mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6 ${className}`}>{children}</div>;
}
