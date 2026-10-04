// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ArticlePrintButton } from '@/modules/site/components/network/ui/article-print-button';

describe('ArticlePrintButton', () => {
  it('membuka dialog cetak dan menyarankan nama file dari judul', () => {
    const printSpy = vi.fn();
    Object.defineProperty(window, 'print', { value: printSpy, configurable: true, writable: true });
    document.title = 'Halaman Situs';
    try {
      render(<ArticlePrintButton title="Banjir Rendam 3 Desa di Hilir!" />);
      fireEvent.click(screen.getByRole('button', { name: /cetak artikel/i }));
      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(document.title).toBe('banjir-rendam-3-desa-di-hilir');
    } finally {
      cleanup();
    }
  });

  it('jatuh ke nama artikel untuk judul tanpa karakter aman', () => {
    const printSpy = vi.fn();
    Object.defineProperty(window, 'print', { value: printSpy, configurable: true, writable: true });
    try {
      render(<ArticlePrintButton title="!!! ***" />);
      fireEvent.click(screen.getByRole('button', { name: /cetak artikel/i }));
      expect(document.title).toBe('artikel');
    } finally {
      cleanup();
    }
  });
});
