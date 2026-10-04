import { describe, expect, it, vi } from 'vitest';

import { checkShareUrl, extractSocialImage, hasRequiredSocialTags } from '@/modules/publishing/share-readiness';

const SOCIAL_HTML =
  '<html><head>' +
  '<meta property="og:title" content="Judul"/>' +
  '<meta property="og:description" content="Deskripsi"/>' +
  '<meta property="og:image" content="https://cdn.test/cover.jpg"/>' +
  '<meta name="twitter:card" content="summary_large_image"/>' +
  '<meta name="twitter:image" content="https://cdn.test/cover.jpg"/>' +
  '</head></html>';

function textResponse(body: string, contentType = 'text/html; charset=utf-8', status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
    arrayBuffer: async () => new ArrayBuffer(4),
  } as unknown as Response;
}

function imageResponse(contentType = 'image/jpeg', status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => '',
    arrayBuffer: async () => new ArrayBuffer(4),
  } as unknown as Response;
}

describe('share-readiness', () => {
  it('mengekstrak og:image dua urutan atribut', () => {
    expect(extractSocialImage(SOCIAL_HTML)).toBe('https://cdn.test/cover.jpg');
    expect(extractSocialImage('<html></html>')).toBeNull();
  });

  it('mewajibkan penanda sosial lengkap', () => {
    expect(hasRequiredSocialTags(SOCIAL_HTML)).toBe(true);
    expect(hasRequiredSocialTags('<html><head></head></html>')).toBe(false);
  });

  it('siap bila html dan gambar valid', async () => {
    const fetchFn = vi.fn(async (url: unknown) =>
      String(url).includes('cdn.test') ? imageResponse() : textResponse(SOCIAL_HTML),
    );
    await expect(checkShareUrl('https://portal.test/a', fetchFn as typeof fetch)).resolves.toMatchObject({
      ready: true,
      imageUrl: 'https://cdn.test/cover.jpg',
    });
  });

  it('tidak siap bila tag tidak lengkap atau gambar rusak', async () => {
    const withoutTags = vi.fn(async () => textResponse('<html></html>'));
    await expect(checkShareUrl('https://portal.test/a', withoutTags as typeof fetch)).resolves.toMatchObject({
      ready: false,
      reason: 'social_tags_incomplete',
    });
    const badImage = vi.fn(async (url: unknown) =>
      String(url).includes('cdn.test') ? imageResponse('text/html', 404) : textResponse(SOCIAL_HTML),
    );
    await expect(checkShareUrl('https://portal.test/a', badImage as typeof fetch)).resolves.toMatchObject({
      ready: false,
    });
  });

  it('menolak url non-https tanpa fetch', async () => {
    const fetchFn = vi.fn(async () => textResponse(SOCIAL_HTML));
    await expect(checkShareUrl('http://portal.test/a', fetchFn as typeof fetch)).resolves.toMatchObject({
      ready: false,
      reason: 'non_https_url',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
