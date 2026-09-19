import { describe, expect, it } from 'vitest';

import { makeNetworkArticle as makeArticle } from '@/modules/delivery/network-test-fixtures';
import {
  articleImage,
  authorDisplayName,
  formatCompactViews,
  formatDate,
  formatFullViews,
  isLocalImageSrc,
  readingMinutes,
  tickerHeadline,
  tickerTime,
} from '@/modules/site/components/network/templates/dark-navy/lib/format';

describe('articleImage', () => {
  it('prioritaskan thumbnail, lalu gambar utama, lalu fallback lokal', () => {
    expect(articleImage(makeArticle({ thumbnailUrl: '/t.jpg', imageUrl: '/i.jpg' }))).toBe('/t.jpg');
    expect(articleImage(makeArticle({ thumbnailUrl: null, imageUrl: 'https://cdn.example/x.jpg' }))).toBe(
      'https://cdn.example/x.jpg',
    );
    expect(articleImage(makeArticle())).toBe('/assets/article-fallback.png');
  });
});

describe('isLocalImageSrc', () => {
  it('true hanya untuk path same-origin', () => {
    expect(isLocalImageSrc('/brand/logo.svg')).toBe(true);
    expect(isLocalImageSrc('https://cdn.example/x.jpg')).toBe(false);
  });
});

describe('readingMinutes', () => {
  it('minimal 1 menit dan 200 kata per menit', () => {
    expect(readingMinutes(makeArticle({ body: '', description: '' }))).toBe(1);
    expect(readingMinutes(makeArticle({ body: 'kata '.repeat(200), description: '' }))).toBe(1);
    expect(readingMinutes(makeArticle({ body: 'kata '.repeat(201), description: '' }))).toBe(2);
  });

  it('jatuh ke deskripsi bila body kosong', () => {
    expect(readingMinutes(makeArticle({ body: '', description: 'kata '.repeat(400) }))).toBe(2);
  });
});

describe('formatCompactViews', () => {
  it('nol dan non-finite menjadi "0"', () => {
    expect(formatCompactViews(0)).toBe('0');
    expect(formatCompactViews(-5)).toBe('0');
    expect(formatCompactViews(Number.NaN)).toBe('0');
  });

  it('format kompak id-ID untuk angka besar', () => {
    expect(formatCompactViews(999)).toBe('999');
    expect(formatCompactViews(1500)).toMatch(/rb/);
  });
});

describe('formatFullViews', () => {
  it('nol menjadi "0" dan ribuan memakai titik', () => {
    expect(formatFullViews(0)).toBe('0');
    expect(formatFullViews(79300)).toBe('79.300');
  });
});

describe('authorDisplayName', () => {
  it('prioritas display, nama, lalu atribusi', () => {
    expect(authorDisplayName(makeArticle({ authorDisplayName: 'D', authorName: 'N', attribution: 'R' }))).toBe('D');
    expect(authorDisplayName(makeArticle({ authorDisplayName: null, authorName: 'N', attribution: 'R' }))).toBe('N');
    expect(authorDisplayName(makeArticle({ authorDisplayName: null, authorName: null, attribution: 'R' }))).toBe('R');
  });
});

describe('tickerHeadline', () => {
  it('buang ekor brand per situs', () => {
    expect(
      tickerHeadline(makeArticle({ title: 'Atlet Muda Bersinar — Sorotan Bisnis Wonosobo' })),
    ).toBe('Atlet Muda Bersinar');
    expect(tickerHeadline(makeArticle({ title: 'Judul | Kanal' }))).toBe('Judul');
  });

  it('pertahankan judul tanpa ekor, termasuk strip biasa', () => {
    expect(tickerHeadline(makeArticle({ title: 'Jakarta - Bandung 2 Jam' }))).toBe('Jakarta - Bandung 2 Jam');
    expect(tickerHeadline(makeArticle({ title: 'Judul Bersih' }))).toBe('Judul Bersih');
  });
});

describe('formatDate dan tickerTime', () => {
  it('string tak valid dikembalikan apa adanya', () => {
    expect(formatDate('bukan-tanggal')).toBe('bukan-tanggal');
    expect(tickerTime('bukan-tanggal')).toBe('bukan-tanggal');
  });

  it('tanggal valid diformat gaya id-ID Asia/Jakarta', () => {
    expect(formatDate('2026-09-14T10:00:00.000Z', 'medium')).toMatch(/Sep 2026/);
    expect(tickerTime('2026-09-14T10:00:00.000Z')).toMatch(/^\d{2}\.\d{2}$/);
  });
});
