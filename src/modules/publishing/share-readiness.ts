/**
 * Penanda sosial minimal yang harus ada sebelum sebuah URL tayang dibagikan.
 *
 * @remarks WhatsApp dan Facebook meng-cache hasil scrape per URL persis, jadi
 * scrape pertama yang mengenai cache basi tanpa `og:image` akan terus tampil
 * tanpa gambar sampai ada scrape ulang manual.
 */
const REQUIRED_SOCIAL_MARKERS = [
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'name="twitter:card"',
  'name="twitter:image"',
] as const;

const OG_IMAGE_PATTERN = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/iu;
const OG_IMAGE_ALT_PATTERN = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/iu;

/**
 * Ambil URL `og:image` dari HTML artikel.
 *
 * @param html - Body HTML halaman artikel.
 * @returns URL gambar sosial atau null bila tidak ditemukan.
 */
export function extractSocialImage(html: string): string | null {
  const direct = OG_IMAGE_PATTERN.exec(html)?.[1]?.trim() ?? '';
  if (direct !== '') return direct;
  const reversed = OG_IMAGE_ALT_PATTERN.exec(html)?.[1]?.trim() ?? '';
  return reversed === '' ? null : reversed;
}

/**
 * Pastikan HTML memuat penanda sosial minimal untuk pratinjau WA/FB.
 *
 * @param html - Body HTML halaman artikel.
 * @returns True bila semua penanda wajib hadir.
 */
export function hasRequiredSocialTags(html: string): boolean {
  const lowered = html.toLowerCase();
  return REQUIRED_SOCIAL_MARKERS.every((marker) => lowered.includes(marker));
}

/** Hasil pemeriksaan kesiapan bagikan satu URL. */
export interface ShareReadiness {
  readonly ready: boolean;
  readonly reason: string;
  readonly imageUrl: string | null;
  readonly checks: Readonly<{ html: boolean; tags: boolean; image: boolean }>;
}

/**
 * Periksa satu URL tayang seperti yang dilihat scraper sosial.
 *
 * @param url - URL https artikel yang tayang.
 * @param fetchFn - Fetch yang dipakai (mudah di-mock pada test).
 * @param timeoutMs - Batas tiap fetch.
 * @returns Kesiapan bagikan; `ready` true hanya bila HTML dan gambar OK.
 */
export async function checkShareUrl(
  url: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<ShareReadiness> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ready: false, reason: 'invalid_url', imageUrl: null, checks: { html: false, tags: false, image: false } };
  }
  if (parsed.protocol !== 'https:') {
    return { ready: false, reason: 'non_https_url', imageUrl: null, checks: { html: false, tags: false, image: false } };
  }
  let html = '';
  try {
    const response = await fetchFn(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'indicate-share-check/1', accept: 'text/html' },
    });
    const contentType = response.headers.get('content-type') ?? '';
    html = await response.text();
    if (!response.ok || !contentType.includes('text/html') || html === '') {
      return { ready: false, reason: `html_http_${response.status}`, imageUrl: null, checks: { html: false, tags: false, image: false } };
    }
  } catch {
    return { ready: false, reason: 'html_fetch_failed', imageUrl: null, checks: { html: false, tags: false, image: false } };
  }
  const imageUrl = extractSocialImage(html);
  const tagsOk = hasRequiredSocialTags(html);
  if (imageUrl === null || !tagsOk) {
    return { ready: false, reason: 'social_tags_incomplete', imageUrl, checks: { html: true, tags: false, image: false } };
  }
  try {
    const imageResponse = await fetchFn(imageUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'indicate-share-check/1', accept: 'image/*' },
    });
    const imageType = imageResponse.headers.get('content-type') ?? '';
    if (!imageResponse.ok || !imageType.startsWith('image/')) {
      return { ready: false, reason: `image_http_${imageResponse.status}`, imageUrl, checks: { html: true, tags: true, image: false } };
    }
    await imageResponse.arrayBuffer();
    return { ready: true, reason: 'ready', imageUrl, checks: { html: true, tags: true, image: true } };
  } catch {
    return { ready: false, reason: 'image_fetch_failed', imageUrl, checks: { html: true, tags: true, image: false } };
  }
}
