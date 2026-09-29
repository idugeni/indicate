import { TIPTAP_MAX_URL_LENGTH, YOUTUBE_ID_PATTERN } from '@/modules/site/tiptap-document/types';

const TWEET_ID_PATTERN = /^\d{5,30}$/u;
const TIKTOK_ID_PATTERN = /^\d{8,25}$/u;
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/u;

function httpsUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH || /[\s<>"\\]/u.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username !== '' || parsed.password !== '') return null;
  return parsed;
}

/**
 * Extract a YouTube video ID from embed, watch, share, or raw-ID inputs.
 *
 * @param value - Candidate video reference from TipTap content.
 * @returns 11-character video ID, or null when the input is not a YouTube reference.
 */
export function extractYouTubeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '');
  const idFromParam = parsed.searchParams.get('v');
  if ((host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com' || host === 'www.youtube-nocookie.com') && idFromParam !== null && YOUTUBE_ID_PATTERN.test(idFromParam)) return idFromParam;
  if (host === 'youtu.be') {
    const candidate = parsed.pathname.replace(/^\//u, '').split('/')[0] ?? '';
    if (YOUTUBE_ID_PATTERN.test(candidate)) return candidate;
  }
  const segments = parsed.pathname.split('/').filter((segment) => segment !== '');
  const embedIndex = segments.findIndex((segment) => segment === 'embed' || segment === 'shorts' || segment === 'live');
  if (embedIndex >= 0) {
    const candidate = segments[embedIndex + 1] ?? '';
    if (YOUTUBE_ID_PATTERN.test(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolve an X/Twitter post reference to its canonical URL.
 *
 * @param value - Raw post ID or a `twitter.com`/`x.com` status URL.
 * @returns Canonical `x.com/i/status/<id>` URL; null when unresolvable.
 */
export function extractTweetUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (TWEET_ID_PATTERN.test(trimmed)) return `https://x.com/i/status/${trimmed}`;
  const parsed = httpsUrl(trimmed);
  if (parsed === null) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '').replace(/^mobile\./u, '');
  if (host !== 'twitter.com' && host !== 'x.com') return null;
  const match = /^\/[^/]+\/status\/(\d{5,30})(?:\/.*)?$/u.exec(parsed.pathname);
  const id = match?.[1];
  if (id === undefined) return null;
  return `https://x.com/i/status/${id}`;
}

/**
 * Resolve an Instagram post reference to its canonical URL.
 *
 * @param value - A post/reel URL (`/p/`, `/reel/`, `/reels/`, `/tv/`).
 * @returns Canonical `instagram.com/<kind>/<code>` URL; null when unresolvable.
 */
export function extractInstagramUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = httpsUrl(trimmed);
  if (parsed === null) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '');
  if (host !== 'instagram.com') return null;
  const match = /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})(?:\/.*)?$/u.exec(parsed.pathname);
  const kind = match?.[1];
  const code = match?.[2];
  if (kind === undefined || code === undefined) return null;
  return `https://www.instagram.com/${kind === 'reels' ? 'reel' : kind}/${code}`;
}

/**
 * Resolve a TikTok video reference to a validated watch URL.
 *
 * @param value - A watch (`/@user/video/<id>`) or embed (`/embed/v2/<id>`) URL.
 * @returns Trimmed original URL when the shape is valid; null otherwise. Short
 * share links (`vm.tiktok.com`) are rejected because they need network resolution.
 */
export function extractTikTokUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = httpsUrl(trimmed);
  if (parsed === null) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '').replace(/^m\./u, '');
  if (host !== 'tiktok.com') return null;
  if (/^\/@[^/]+\/video\/\d{8,25}(?:\/.*)?$/u.test(parsed.pathname)) return trimmed;
  if (/^\/embed\/v2\/\d{8,25}(?:\/.*)?$/u.test(parsed.pathname)) return trimmed;
  if (TIKTOK_ID_PATTERN.test(trimmed)) return `https://www.tiktok.com/embed/v2/${trimmed}`;
  return null;
}

/**
 * Resolve a Facebook post reference to a validated URL.
 *
 * @param value - A post/video/reel/watch URL on `facebook.com`.
 * @returns Trimmed original URL when the shape is valid; null otherwise. Short
 * share links (`fb.watch`) are rejected because they need network resolution.
 */
export function extractFacebookUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = httpsUrl(trimmed);
  if (parsed === null) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '').replace(/^m\./u, '');
  if (host !== 'facebook.com') return null;
  if (/\/(posts|videos|reel)\/[^/?#]+/u.test(parsed.pathname)) return trimmed;
  if (parsed.pathname === '/watch' || parsed.pathname === '/watch/') {
    const v = parsed.searchParams.get('v');
    if (v !== null && /^\d{5,30}$/u.test(v)) return trimmed;
  }
  return null;
}

export interface SocialEmbed {
  readonly type: 'youtube' | 'twitter' | 'instagram' | 'tiktok' | 'facebook';
  readonly url: string;
}

/**
 * Detect a supported social/video embed from a pasted URL or raw ID.
 *
 * @param value - Candidate URL from the editor embed panel.
 * @returns Platform plus canonical URL; null when no platform matches.
 */
export function detectSocialEmbed(value: unknown): SocialEmbed | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const youtube = extractYouTubeId(value);
  if (youtube !== null) return { type: 'youtube', url: `https://www.youtube.com/watch?v=${youtube}` };
  const tweet = extractTweetUrl(value);
  if (tweet !== null) return { type: 'twitter', url: tweet };
  const instagram = extractInstagramUrl(value);
  if (instagram !== null) return { type: 'instagram', url: instagram };
  const tiktok = extractTikTokUrl(value);
  if (tiktok !== null) return { type: 'tiktok', url: tiktok };
  const facebook = extractFacebookUrl(value);
  if (facebook !== null) return { type: 'facebook', url: facebook };
  return null;
}

/**
 * Resolve a Google Drive/Docs reference to a validated URL.
 *
 * @param value - A Drive file (`/file/d/<id>`), folder (`/drive/folders/<id>`),
 * `open?id=<id>`, or Docs editors (`document|spreadsheets|presentation|forms|drawings`)
 * URL.
 * @returns Trimmed original URL when the shape is valid; null otherwise.
 */
export function extractDriveUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = httpsUrl(trimmed);
  if (parsed === null) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '');
  if (host === 'drive.google.com') {
    if (/^\/file\/d\/[A-Za-z0-9_-]{20,}(\/.*)?$/u.test(parsed.pathname)) return trimmed;
    if (/^\/drive\/folders\/[A-Za-z0-9_-]{20,}(\/.*)?$/u.test(parsed.pathname)) return trimmed;
    if (parsed.pathname === '/open' || parsed.pathname === '/open/') {
      const id = parsed.searchParams.get('id');
      if (id !== null && DRIVE_ID_PATTERN.test(id)) return trimmed;
    }
    return null;
  }
  if (host === 'docs.google.com') {
    if (/^\/(document|spreadsheets|presentation|forms|drawings)\/d\/(?:e\/)?[A-Za-z0-9_-]{20,}(\/.*)?$/u.test(parsed.pathname)) return trimmed;
    return null;
  }
  return null;
}

/**
 * Detect a Google Drive/Docs embed from a pasted URL.
 *
 * @param value - Candidate URL from the editor embed panel.
 * @returns Drive embed plus validated URL; null when the shape is unsupported.
 */
export function detectDriveEmbed(value: unknown): { readonly type: 'drive'; readonly url: string } | null {
  const url = extractDriveUrl(value);
  if (url === null) return null;
  return { type: 'drive', url };
}
