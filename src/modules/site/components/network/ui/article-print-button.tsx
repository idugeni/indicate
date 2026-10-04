'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';

/**
 * Build a filesystem-safe PDF filename from an article title.
 *
 * @param title - Raw article title.
 * @returns Lowercase dash-separated slug, or `artikel` when nothing survives.
 */
function printFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug === '' ? 'artikel' : slug;
}

/**
 * Print / Save-as-PDF button for an article page.
 *
 * @remarks Sets `document.title` to a sanitized slug before printing so the
 * browser's Save-as-PDF dialog suggests a meaningful filename, then restores
 * it on `afterprint` with a timeout fallback for browsers that skip the
 * event when the dialog is cancelled. Renders nothing printable itself.
 *
 * @param title - Article title used for the suggested PDF filename.
 * @returns Outline pill that opens the print dialog.
 */
export function ArticlePrintButton({ title }: { readonly title: string }) {
  useEffect(() => {
    const previous = document.title;
    const suggest = () => {
      document.title = printFileName(title);
    };
    const restore = () => {
      document.title = previous;
    };
    window.addEventListener('beforeprint', suggest);
    window.addEventListener('afterprint', restore);
    return () => {
      window.removeEventListener('beforeprint', suggest);
      window.removeEventListener('afterprint', restore);
      document.title = previous;
    };
  }, [title]);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    const previous = document.title;
    document.title = printFileName(title);
    window.print();
    window.setTimeout(() => {
      document.title = previous;
    }, 1000);
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      aria-label={`Cetak artikel: ${title}`}
      data-print-button="true"
      className="inline-flex h-9 flex-none items-center gap-2 rounded-full px-3.5 font-sans text-xs font-bold text-[var(--tpl-muted,#64748b)] ring-1 ring-[var(--tpl-ring,#e2e8f0)] transition-colors hover:text-[var(--tpl-primary,#1a5fd0)] print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Cetak / PDF
    </button>
  );
}
