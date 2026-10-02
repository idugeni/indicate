import { describe, expect, it } from 'vitest';

import { splitLegalParagraphs } from '@/modules/site/components/layout/doc-section';

describe('splitLegalParagraphs', () => {
  it('mempertahankan body tanpa jeda sebagai satu paragraf', () => {
    expect(splitLegalParagraphs('Satu paragraf utuh.')).toEqual(['Satu paragraf utuh.']);
  });

  it('membelah pada baris kosong dan membuang sisa kosong', () => {
    expect(splitLegalParagraphs('Pertama.\n\nKedua.\n\n\nKetiga.')).toEqual(['Pertama.', 'Kedua.', 'Ketiga.']);
  });
});
