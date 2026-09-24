import { describe, expect, it } from 'vitest';

import { detectDriveEmbed, detectSocialEmbed, extractDriveUrl, extractFacebookUrl, extractInstagramUrl, extractTikTokUrl, extractTweetUrl, extractTipTapImages, extractYouTubeId, isSafeLinkUrl, isSafeMediaSrc, tiptapToLegacyBody, tiptapToText, validateTipTapDoc } from '@/modules/site/tiptap-document';

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

describe('social embed extractors', () => {
  it('menormalkan URL X ke bentuk kanonis', () => {
    expect(extractTweetUrl('https://x.com/redaksi/status/1234567890123456789')).toBe(
      'https://x.com/i/status/1234567890123456789',
    );
    expect(extractTweetUrl('https://twitter.com/redaksi/status/1234567890123456789')).toBe(
      'https://x.com/i/status/1234567890123456789',
    );
    expect(extractTweetUrl('1234567890123456789')).toBe('https://x.com/i/status/1234567890123456789');
  });

  it('menormalkan URL Instagram ke bentuk kanonis', () => {
    expect(extractInstagramUrl('https://www.instagram.com/p/C8AbC123dEf/')).toBe(
      'https://www.instagram.com/p/C8AbC123dEf',
    );
    expect(extractInstagramUrl('https://www.instagram.com/reels/C8AbC123dEf/')).toBe(
      'https://www.instagram.com/reel/C8AbC123dEf',
    );
  });

  it('menerima URL tonton dan semat TikTok', () => {
    expect(extractTikTokUrl('https://www.tiktok.com/@redaksi/video/7234567890123456789')).toBe(
      'https://www.tiktok.com/@redaksi/video/7234567890123456789',
    );
    expect(extractTikTokUrl('https://www.tiktok.com/embed/v2/7234567890123456789')).toBe(
      'https://www.tiktok.com/embed/v2/7234567890123456789',
    );
  });

  it('menerima URL postingan Facebook', () => {
    expect(extractFacebookUrl('https://www.facebook.com/lapassmg/posts/1234567890123456')).toBe(
      'https://www.facebook.com/lapassmg/posts/1234567890123456',
    );
    expect(extractFacebookUrl('https://www.facebook.com/watch/?v=1234567890123456')).toBe(
      'https://www.facebook.com/watch/?v=1234567890123456',
    );
  });

  it('menolak tautan pendek dan host asing', () => {
    expect(extractTweetUrl('https://evil.example/redaksi/status/1234567890123456789')).toBe(null);
    expect(extractInstagramUrl('https://www.instagram.com/')).toBe(null);
    expect(extractTikTokUrl('https://vm.tiktok.com/AbC123/')).toBe(null);
    expect(extractFacebookUrl('https://fb.watch/AbC123/')).toBe(null);
  });

  it('mendeteksi platform dari tempelan URL', () => {
    expect(detectSocialEmbed('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(detectSocialEmbed('https://x.com/redaksi/status/1234567890123456789')).toEqual({
      type: 'twitter',
      url: 'https://x.com/i/status/1234567890123456789',
    });
    expect(detectSocialEmbed('https://www.instagram.com/p/C8AbC123dEf/')).toEqual({
      type: 'instagram',
      url: 'https://www.instagram.com/p/C8AbC123dEf',
    });
    expect(detectSocialEmbed('https://www.tiktok.com/@redaksi/video/7234567890123456789')).toEqual({
      type: 'tiktok',
      url: 'https://www.tiktok.com/@redaksi/video/7234567890123456789',
    });
    expect(detectSocialEmbed('https://www.facebook.com/lapassmg/posts/1234567890123456')).toEqual({
      type: 'facebook',
      url: 'https://www.facebook.com/lapassmg/posts/1234567890123456',
    });
    expect(detectSocialEmbed('https://evil.example/x')).toBe(null);
  });
});

describe('extractDriveUrl', () => {
  it('menerima berkas, folder, dan editor Docs', () => {
    expect(extractDriveUrl('https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view?usp=sharing')).toBe(
      'https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view?usp=sharing',
    );
    expect(extractDriveUrl('https://drive.google.com/drive/folders/1AbC2dEfGhIjKlMnOpQrStUvWx')).toBe(
      'https://drive.google.com/drive/folders/1AbC2dEfGhIjKlMnOpQrStUvWx',
    );
    expect(extractDriveUrl('https://docs.google.com/document/d/1AbC2dEfGhIjKlMnOpQrStUvWx/edit')).toBe(
      'https://docs.google.com/document/d/1AbC2dEfGhIjKlMnOpQrStUvWx/edit',
    );
    expect(extractDriveUrl('https://docs.google.com/spreadsheets/d/1AbC2dEfGhIjKlMnOpQrStUvWx/edit#gid=0')).toBe(
      'https://docs.google.com/spreadsheets/d/1AbC2dEfGhIjKlMnOpQrStUvWx/edit#gid=0',
    );
  });

  it('menolak beranda drive dan host asing', () => {
    expect(extractDriveUrl('https://drive.google.com/drive/home')).toBe(null);
    expect(extractDriveUrl('https://evil.example/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view')).toBe(null);
    expect(extractDriveUrl('http://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view')).toBe(null);
  });

  it('mendeteksi sematan drive lewat panel editor', () => {
    expect(detectDriveEmbed('https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view')).toEqual({
      type: 'drive',
      url: 'https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view',
    });
    expect(detectDriveEmbed('https://evil.example/x')).toBe(null);
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

  it('menerima tabel, perataan, stabilo, dan warna teks valid', () => {
    const cell = (text: string) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'Tengah' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Stabilo', marks: [{ type: 'highlight' }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Warna', marks: [{ type: 'textStyle', attrs: { color: '#b91c1c' } }] }] },
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, cell('B')] },
            { type: 'tableRow', content: [cell('1'), cell('2')] },
          ],
        },
      ],
    };
    expect(validateTipTapDoc(doc).ok).toBe(true);
  });

  it('menolak tabel, perataan, dan warna tak valid', () => {
    const cell = (text: string) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
    expect(validateTipTapDoc({ type: 'doc', content: [{ type: 'table', content: [] }] }).ok).toBe(false);
    expect(validateTipTapDoc({ type: 'doc', content: [{ type: 'table', content: [{ type: 'paragraph' }] }] }).ok).toBe(false);
    expect(validateTipTapDoc({ type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'diagonal' }, content: [] }] }).ok).toBe(false);
    const badColor = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'red;evil' } }] }] }] };
    expect(validateTipTapDoc(badColor).ok).toBe(false);
    const wide = { type: 'tableRow', content: Array.from({ length: 13 }, (_, index) => cell(String(index))) };
    expect(validateTipTapDoc({ type: 'doc', content: [{ type: 'table', content: [wide] }] }).ok).toBe(false);
  });

  it('menerima sematan sosial kanonis dan menolak src asing', () => {
    const good = {
      type: 'doc',
      content: [
        { type: 'twitter', attrs: { src: 'https://x.com/i/status/1234567890123456789' } },
        { type: 'instagram', attrs: { src: 'https://www.instagram.com/p/C8AbC123dEf' } },
        { type: 'tiktok', attrs: { src: 'https://www.tiktok.com/@redaksi/video/7234567890123456789' } },
        { type: 'facebook', attrs: { src: 'https://www.facebook.com/lapassmg/posts/1234567890123456' } },
      ],
    };
    expect(validateTipTapDoc(good).ok).toBe(true);
    expect(
      validateTipTapDoc({ type: 'doc', content: [{ type: 'twitter', attrs: { src: 'https://evil.example/x/1' } }] }).ok,
    ).toBe(false);
    expect(
      validateTipTapDoc({ type: 'doc', content: [{ type: 'instagram', attrs: { src: 'https://twitter.com/x' } }] }).ok,
    ).toBe(false);
    expect(
      validateTipTapDoc({ type: 'doc', content: [{ type: 'drive', attrs: { src: 'https://drive.google.com/file/d/1AbC2dEfGhIjKlMnOpQrStUvWx/view' } }] }).ok,
    ).toBe(true);
    expect(
      validateTipTapDoc({ type: 'doc', content: [{ type: 'drive', attrs: { src: 'https://drive.google.com/drive/home' } }] }).ok,
    ).toBe(false);
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

describe('extractTipTapImages', () => {
  it('mengekstrak referensi media berurutan dokumen dengan alt dan caption', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Pembuka' }] },
        { type: 'image', attrs: { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Pasar pagi', title: 'Suasana pasar' } },
        { type: 'image', attrs: { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcdf' } },
        { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'jahat' } },
        { type: 'image', attrs: { src: 'https://cdn.example/x.jpg', alt: 'luar' } },
      ],
    };
    expect(extractTipTapImages(doc)).toEqual([
      { mediaId: '0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Pasar pagi', caption: 'Suasana pasar' },
      { mediaId: '0199a2b3-4c5d-7e8f-9012-3456789abcdf', alt: null, caption: null },
    ]);
    expect(extractTipTapImages({ type: 'paragraph' })).toEqual([]);
    expect(extractTipTapImages(null)).toEqual([]);
  });
});
