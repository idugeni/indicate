import { describe, expect, it } from 'vitest';

import { describeBodyJsonProblem } from '@/modules/dashboard/components/editorial/body-json-diagnostics';

const paragraph = (attrs?: Record<string, unknown>, text = 'Halo') => ({
  type: 'paragraph',
  ...(attrs === undefined ? {} : { attrs }),
  content: [{ type: 'text', text }],
});

describe('describeBodyJsonProblem', () => {
  it('meloloskan dokumen kosong karena editor yang belum disentuh bukan kesalahan', () => {
    expect(describeBodyJsonProblem(null)).toBeNull();
    expect(describeBodyJsonProblem(undefined)).toBeNull();
  });

  it('meloloskan dokumen yang valid', () => {
    expect(describeBodyJsonProblem({ type: 'doc', content: [paragraph()] })).toBeNull();
    expect(describeBodyJsonProblem({ type: 'doc', content: [paragraph({ textAlign: 'center' })] })).toBeNull();
  });

  it('menerjemahkan perataan tak dikenal jadi kalimat yang bisa ditindaklanjuti', () => {
    const message = describeBodyJsonProblem({ type: 'doc', content: [paragraph({ textAlign: 'diagonal' })] });
    expect(message).toBe('Perataan teks bukan rata kiri, tengah, kanan, atau rata kanan-kiri.');
  });

  it('menerjemahkan node tak dikenal dengan menyebut elemennya', () => {
    expect(describeBodyJsonProblem({ type: 'doc', content: [{ type: 'script' }] })).toBe(
      'Elemen "script" tidak dikenal dan tidak bisa disimpan.',
    );
  });

  it('menerjemahkan warna hex yang rusak', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'red;evil' } }] }] }] };
    expect(describeBodyJsonProblem(doc)).toBe('Warna teks bukan format hex yang valid, misalnya #b91c1c.');
  });

  it('menerjemahkan dokumen yang bukan doc sama sekali', () => {
    expect(describeBodyJsonProblem('bukan-dokumen')).toBe(
      'Struktur isi artikel tidak terbaca. Muat ulang editor lalu tulis ulang bagian ini.',
    );
  });

  it('menerjemahkan referensi sematan sosial yang tidak kanonis', () => {
    const doc = { type: 'doc', content: [{ type: 'twitter', attrs: { src: 'https://evil.example/x/1' } }] };
    expect(describeBodyJsonProblem(doc)).toBe('Tautan twitter tidak valid atau bukan URL kanonis.');
  });
});
