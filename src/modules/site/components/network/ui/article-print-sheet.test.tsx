// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ArticlePrintFooter, ArticlePrintMasthead } from '@/modules/site/components/network/ui/article-print-sheet';

describe('ArticlePrintMasthead', () => {
  it('menampilkan kop, meta, dan sumber', () => {
    try {
      render(
        <ArticlePrintMasthead
          siteName="Portal Daerah"
          byline="Redaksi"
          dateLabel="12 Agu 2026"
          canonical="https://contoh.id/banjir"
        />,
      );
      expect(screen.getByText('Portal Daerah')).toBeDefined();
      expect(screen.getByText('Redaksi · 12 Agu 2026')).toBeDefined();
      expect(screen.getByText('https://contoh.id/banjir')).toBeDefined();
    } finally {
      cleanup();
    }
  });

  it('menghilangkan pemisah saat byline atau tanggal kosong', () => {
    try {
      render(<ArticlePrintMasthead siteName="Portal Daerah" byline="" dateLabel="" canonical="" />);
      expect(screen.getByText('Portal Daerah')).toBeDefined();
      expect(screen.queryByText(/·/)).toBe(null);
    } finally {
      cleanup();
    }
  });
});

describe('ArticlePrintFooter', () => {
  it('menampilkan sumber dan atribusi tahun berjalan', () => {
    try {
      render(<ArticlePrintFooter siteName="Portal Daerah" canonical="https://contoh.id/banjir" />);
      expect(screen.getByText('Sumber: https://contoh.id/banjir')).toBeDefined();
      expect(screen.getByText(`© ${new Date().getFullYear()} Portal Daerah — Dicetak dari halaman artikel.`)).toBeDefined();
    } finally {
      cleanup();
    }
  });
});
