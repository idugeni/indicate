import type { ReactNode } from 'react';

/**
 * Penampung konten selebar contoh (max-6xl).
 *
 * @param children - Isi halaman.
 * @param className - Tambahan kelas utilitas.
 * @returns Kontainer tenant.
 */
export function GreenMinimalContainer({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}
