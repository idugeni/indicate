import { describe, expect, it } from 'vitest';

import { composeArticleCreated, composeJobFailed, composeJobPublished, fitsTelegramLimit } from '@/modules/integrations/telegram-notifications';

describe('composeArticleCreated', () => {
  it('memuat judul, id, dan tautan mini app tanpa format khusus', () => {
    const text = composeArticleCreated({ articleId: 'art-1', title: 'Rilis Pers Redaksi', miniAppUrl: 'https://indicate.web.id/tg/app' });
    expect(text).toContain('Draf artikel baru dibuat.');
    expect(text).toContain('Judul: Rilis Pers Redaksi');
    expect(text).toContain('ID artikel: art-1');
    expect(text).toContain('https://indicate.web.id/tg/app');
    expect(text).not.toContain('*');
    expect(fitsTelegramLimit(text)).toBe(true);
  });

  it('memotong judul sangat panjang', () => {
    const text = composeArticleCreated({ articleId: 'art-1', title: `${'A'.repeat(300)}`, miniAppUrl: 'https://indicate.web.id/tg/app' });
    expect(text).toContain('…');
    expect(fitsTelegramLimit(text)).toBe(true);
  });
});

describe('composeJobPublished', () => {
  it('mendaftar portal tayang beserta tautannya', () => {
    const text = composeJobPublished({
      title: 'Berita Utama',
      published: [
        { hostname: 'portal-a.test', url: 'https://portal-a.test/berita-utama' },
        { hostname: 'portal-b.test', url: 'https://portal-b.test/berita-utama' },
      ],
      finishedAt: '2026-09-19T11:00:00.000Z',
    });
    expect(text).toContain('Penerbitan selesai.');
    expect(text).toContain('Tayang di 2 portal:');
    expect(text).toContain('https://portal-a.test/berita-utama');
    expect(text).toContain('Selesai: ');
    expect(fitsTelegramLimit(text)).toBe(true);
  });

  it('meringkas daftar portal yang panjang', () => {
    const published = Array.from({ length: 8 }, (_, index) => ({ hostname: `portal-${index}.test`, url: `https://portal-${index}.test/a` }));
    const text = composeJobPublished({ title: 'Berita', published, finishedAt: '2026-09-19T11:00:00.000Z' });
    expect(text).toContain('… dan 3 portal lainnya.');
    expect(fitsTelegramLimit(text)).toBe(true);
  });
});

describe('composeJobFailed', () => {
  it('memanusiakan kode galat dan menyertakan tautan ulangi', () => {
    const text = composeJobFailed({
      title: 'Berita Utama',
      jobId: 'job-1',
      failures: [
        { hostname: 'portal-a.test', code: 'retry_exhausted' },
        { hostname: 'portal-b.test', code: 'kode_tak_dikenal' },
      ],
      miniAppUrl: 'https://indicate.web.id/tg/app',
    });
    expect(text).toContain('Penerbitan gagal dan tidak dicoba ulang otomatis.');
    expect(text).toContain('ID pekerjaan: job-1');
    expect(text).toContain('portal-a.test: batas percobaan habis');
    expect(text).toContain('portal-b.test: kesalahan internal portal');
    expect(text).not.toContain('kode_tak_dikenal');
    expect(text).toContain('https://indicate.web.id/tg/app');
    expect(fitsTelegramLimit(text)).toBe(true);
  });

  it('menyebut portal yang tetap tayang saat gagal sebagian', () => {
    const text = composeJobFailed({
      title: 'Berita Utama',
      jobId: 'job-1',
      failures: [{ hostname: 'portal-a.test', code: 'retry_exhausted' }],
      publishedHostnames: ['portal-b.test'],
      miniAppUrl: 'https://indicate.web.id/tg/app',
    });
    expect(text).toContain('Penerbitan selesai sebagian.');
    expect(text).toContain('Tetap tayang di: portal-b.test.');
  });
});
