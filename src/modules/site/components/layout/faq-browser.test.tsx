// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { FaqBrowser } from '@/modules/site/components/layout/faq-browser';

afterEach(() => {
  cleanup();
});

const ITEMS = [
  { id: 'f-1', question: 'Apakah butuh server sendiri?', answer: 'Tidak, satu infrastruktur terpusat.', category: 'Teknis' },
  { id: 'f-2', question: 'Berapa biayanya?', answer: 'Disepakati di depan via obrolan.', category: 'Biaya' },
  { id: 'f-3', question: 'Apakah domain milik saya?', answer: 'Ya, domain atas nama Anda.', category: 'Biaya' },
];

describe('FaqBrowser', () => {
  it('menampilkan chips topik dan hitungan awal', () => {
    render(<FaqBrowser items={ITEMS} />);
    expect(screen.getByText('3 jawaban dalam 2 topik')).toBeDefined();
    expect(screen.getByRole('link', { name: /teknis/i })).toBeDefined();
  });

  it('menyaring jawaban per kata kunci dan mereset', () => {
    render(<FaqBrowser items={ITEMS} />);
    fireEvent.change(screen.getByPlaceholderText(/cari jawaban/i), { target: { value: 'domain' } });
    expect(screen.getByText('1 dari 3 jawaban cocok')).toBeDefined();
    expect(screen.queryByText('Berapa biayanya?')).toBe(null);

    fireEvent.change(screen.getByPlaceholderText(/cari jawaban/i), { target: { value: 'tidak-cocok-xyz' } });
    expect(screen.getByText('Tidak ada jawaban yang cocok.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /tampilkan semua jawaban/i }));
    expect(screen.getByText('3 jawaban dalam 2 topik')).toBeDefined();
  });
});
