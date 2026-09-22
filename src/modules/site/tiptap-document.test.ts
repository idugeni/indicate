import { describe, expect, it } from 'vitest';

import { extractYouTubeId, isSafeLinkUrl, isSafeMediaSrc, tiptapToLegacyBody, tiptapToText, validateTipTapDoc } from '@/modules/site/tiptap-document';

describe('isSafeLinkUrl', () => {
  it('menerima path relatif dan https publik', () => {
    expect(isSafeLinkUrl('/berita-utama')).toBe(true);
    expect(isSafeLinkUrl('https://contoh.id/a')).toBe(true);
  });

  it('menolak skema berbahaya dan host privat', () => {
    expect(isSafeLinkUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeLinkUrl('data:text/html,hi')).toBe(false);
    expect(isSafeLinkUrl('http://127.0.0.1/x')).toBe(false);
    expect(isSafeLinkUrl('https://10.0.0.1/x')).toBe(false);
    expect(isSafeLinkUrl('//evil.example/x')).toBe(false);
  });
});

describe('isSafeMediaSrc', () => {
  it('menerima referensi media, path situs, dan https', () => {
    expect(isSafeMediaSrc('media:0199a2b3-4c5d-7e8f-9012-3456789abcde')).toBe(true);
    expect(isSafeMediaSrc('/api/network/media/0199a2b3-4c5d-7e8f-9012-3456789abcde')).toBe(true);
    expect(isSafeMediaSrc('https://cdn.contoh.id/gambar.webp')).toBe(true);
  });

  it('menolak http, data, dan uuid rusak', () => {
    expect(isSafeMediaSrc('http://cdn.contoh.id/gambar.jpg')).toBe(false);
    expect(isSafeMediaSrc('data:image/png;base64,aaa')).toBe(false);
    expect(isSafeMediaSrc('media:bukan-uuid')).toBe(false);
  });
});

describe('extractYouTubeId', () => {
  it('mengekstrak ID dari varian URL dan ID mentah', () => {
    expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('menolak ID palsu dan host asing', () => {
    expect(extractYouTubeId('terlalu-panjang-xxxx')).toBe(null);
    expect(extractYouTubeId('https://evil.example/watch?v=dQw4w9WgXcQ')).toBe(null);
  });
});

describe('validateTipTapDoc', () => {
  it('menerima dokumen editorial minimal', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Halo dunia' }] }] };
    expect(validateTipTapDoc(doc).ok).toBe(true);
  });

  it('menolak node, mark, dan URL tak dikenal', () => {
    expect(validateTipTapDoc({ type: 'doc', content: [{ type: 'script' }] }).ok).toBe(false);
    expect(validateTipTapDoc({ type: 'paragraph' }).ok).toBe(false);
    const badLink = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] };
    expect(validateTipTapDoc(badLink).ok).toBe(false);
  });
});

describe('tiptapToText', () => {
  it('mereduksi dokumen menjadi teks polos tanpa media', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Judul' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Halo ' }, { type: 'text', text: 'dunia', marks: [{ type: 'bold' }] }] },
        { type: 'image', attrs: { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Alt' } },
        { type: 'youtube', attrs: { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
      ],
    };
    expect(tiptapToText(doc)).toBe('Judul Halo dunia');
    expect(tiptapToLegacyBody(doc)).toBe('## Judul\n\nHalo dunia');
  });
});
