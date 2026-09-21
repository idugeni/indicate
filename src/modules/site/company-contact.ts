/**
 * Shared company contact for all tenants.
 *
 * @remarks
 * Single source for the PT Sanca Phena Cakra accounts. All templates (current
 * and future) must resolve channels via `resolveContactChannels` for consistency.
 * Fill in each URL/email/number below once — every tenant contact page and footer
 * follows it. Keys left unfilled stay empty and are hidden from rendering automatically.
 */
export const COMPANY_NAME = 'PT Sanca Phena Cakra';

export const COMPANY_EMAIL = 'sancaphenacakra@gmail.com';

export const COMPANY_PHONE = '085641159405';

const COMPANY_SOCIALS: Readonly<Record<string, string>> = {
  facebook: 'https://facebook.com/safenca.id',
  instagram: 'https://instagram.com/safenca.id',
  x: 'https://x.com/safenca_id',
  youtube: 'https://youtube.com/@safenca.id',
  tiktok: 'https://tiktok.com/@safenca.id',
  telegram: 'https://t.me/safenca_id',
  whatsapp: 'https://wa.me/6285641159405',
  linkedin: 'https://linkedin.com/company/safenca-id',
};

const CHANNEL_LABELS: Readonly<Record<string, string>> = {
  email: 'Email',
  telepon: 'Telepon',
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  bluesky: 'Bluesky',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  discord: 'Discord',
  twitch: 'Twitch',
  spotify: 'Spotify',
  medium: 'Medium',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  github: 'GitHub',
  line: 'Line',
  quora: 'Quora',
  tumblr: 'Tumblr',
  mastodon: 'Mastodon',
};

/** Social channel display order across all surfaces. */
export const SOCIAL_ORDER = [
  'facebook',
  'instagram',
  'x',
  'youtube',
  'tiktok',
  'telegram',
  'whatsapp',
  'linkedin',
  'threads',
  'bluesky',
  'snapchat',
  'pinterest',
  'reddit',
  'discord',
  'twitch',
  'spotify',
  'medium',
  'vimeo',
  'dailymotion',
  'github',
  'line',
  'quora',
  'tumblr',
  'mastodon',
] as const;

const SOCIAL_PLACEHOLDERS: Readonly<Record<string, string>> = {
  facebook: 'https://facebook.com/...',
  instagram: 'https://instagram.com/...',
  x: 'https://x.com/...',
  youtube: 'https://youtube.com/...',
  tiktok: 'https://tiktok.com/...',
  telegram: 'https://t.me/...',
  whatsapp: 'https://wa.me/...',
  linkedin: 'https://linkedin.com/...',
  threads: 'https://threads.com/...',
  bluesky: 'https://bsky.app/...',
  snapchat: 'https://snapchat.com/...',
  pinterest: 'https://pinterest.com/...',
  reddit: 'https://reddit.com/...',
  discord: 'https://discord.gg/...',
  twitch: 'https://twitch.tv/...',
  spotify: 'https://open.spotify.com/...',
  medium: 'https://medium.com/...',
  vimeo: 'https://vimeo.com/...',
  dailymotion: 'https://dailymotion.com/...',
  github: 'https://github.com/...',
  line: 'https://line.me/...',
  quora: 'https://quora.com/...',
  tumblr: 'https://tumblr.com/...',
  mastodon: 'https://mastodon.social/...',
};

export interface SocialFieldDef {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
}

/** Social field definitions for the dashboard form, ordered per `SOCIAL_ORDER`. */
export const SOCIAL_FIELD_DEFS: readonly SocialFieldDef[] = SOCIAL_ORDER.map((key) => ({
  key,
  label: CHANNEL_LABELS[key] ?? key,
  placeholder: SOCIAL_PLACEHOLDERS[key] ?? 'https://...',
}));

const RESERVED_PUBLISHER_CONTACT_KEYS: ReadonlySet<string> = new Set(['logourl', 'city', 'bio']);

export interface ContactChannel {
  readonly key: string;
  readonly label: string;
  readonly href: string;
}

/** Direct contact channels rendered as full primary rows. */
export const PRIMARY_CONTACT_KEYS = ['email', 'telepon', 'whatsapp'] as const;

/**
 * True when the channel is a direct contact (primary row).
 *
 * @param key - Channel key (`ContactChannel.key`).
 * @returns True for email, phone, and WhatsApp.
 */
export function isPrimaryContact(key: string): boolean {
  return (PRIMARY_CONTACT_KEYS as readonly string[]).includes(key);
}

const CHANNEL_ACTIONS: Readonly<Record<string, string>> = {
  whatsapp: 'Chat',
  telegram: 'Chat',
  email: 'Kirim email',
  telepon: 'Hubungi',
  facebook: 'Ikuti',
  instagram: 'Ikuti',
  x: 'Ikuti',
  tiktok: 'Ikuti',
  linkedin: 'Ikuti',
  threads: 'Ikuti',
  bluesky: 'Ikuti',
  youtube: 'Tonton',
  twitch: 'Tonton',
  vimeo: 'Tonton',
  dailymotion: 'Tonton',
};

/**
 * Per-channel call-to-action verb.
 *
 * @param key - Channel key (`ContactChannel.key`).
 * @returns Short call-to-action; `Buka` when unknown.
 */
export function channelAction(key: string): string {
  return CHANNEL_ACTIONS[key] ?? 'Buka';
}

const HANDLE_PREFIX_KEYS: ReadonlySet<string> = new Set([
  'instagram',
  'x',
  'tiktok',
  'telegram',
  'threads',
  'bluesky',
]);

/**
 * Channel display text/handle from a raw href.
 *
 * @param channel - Render-ready contact channel.
 * @returns Email address, phone number, or `@...` handle/slug; the original href when unparseable.
 */
export function channelHandle(channel: ContactChannel): string {
  const href = channel.href.trim();
  if (channel.key === 'email') return href.replace(/^mailto:/iu, '');
  if (channel.key === 'telepon' || href.startsWith('tel:')) return href.replace(/^tel:/iu, '');
  if (channel.key === 'whatsapp') {
    const digits = href.replace(/\D/gu, '');
    const local = digits.replace(/^62/u, '0');
    return local === '' ? href : local;
  }
  try {
    const url = new URL(href);
    const segments = url.pathname.split('/').filter(Boolean);
    const tail = (segments[segments.length - 1] ?? '').replace(/^@/u, '');
    if (tail === '') return url.hostname.replace(/^www\./u, '');
    return HANDLE_PREFIX_KEYS.has(channel.key) ? `@${tail}` : tail;
  } catch {
    return href;
  }
}

/**
 * Extracts a publisher's own social links from raw `contacts` JSON.
 *
 * @param contacts - Raw `publishers.contacts` payload; non-string values are ignored.
 * @returns Social entries keyed by platform; reserved display keys excluded.
 */
export function pickPublisherSocials(
  contacts: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  const socials: Record<string, string> = {};
  for (const key of SOCIAL_ORDER) {
    const value = contacts[key];
    if (typeof value === 'string' && value.trim() !== '') socials[key] = value.trim();
  }
  for (const [rawKey, value] of Object.entries(contacts)) {
    const key = rawKey.toLowerCase();
    if (typeof value !== 'string' || value.trim() === '') continue;
    if (key in socials || RESERVED_PUBLISHER_CONTACT_KEYS.has(key)) continue;
    socials[key] = value.trim();
  }
  return socials;
}

/**
 * Resolves render-ready channels from a publisher's own social links.
 *
 * @param socials - Publisher social links as extracted by `pickPublisherSocials`.
 * @returns Ordered channels without company-default fallback.
 */
export function resolvePublisherChannels(
  socials: Readonly<Record<string, string>>,
): readonly ContactChannel[] {
  const channels: ContactChannel[] = [];
  for (const key of SOCIAL_ORDER) {
    const href = socials[key]?.trim() ?? '';
    if (href === '') continue;
    channels.push({ key, label: labelFor(key), href });
  }
  for (const [rawKey, rawHref] of Object.entries(socials)) {
    const key = rawKey.toLowerCase();
    const href = rawHref.trim();
    if (href === '' || SOCIAL_ORDER.includes(key as (typeof SOCIAL_ORDER)[number])) continue;
    channels.push({ key, label: labelFor(key), href });
  }
  return channels;
}

function labelFor(key: string): string {
  return CHANNEL_LABELS[key] ?? key.slice(0, 1).toUpperCase() + key.slice(1);
}

/**
 * Resolve tenant contact channels: company defaults plus per-site overrides.
 *
 * @param siteSocials - Site `socialLinks`; non-empty values win over defaults.
 * @returns Ordered render-ready channels; empty entries are dropped.
 */
export function resolveContactChannels(
  siteSocials: Readonly<Record<string, string>>,
): readonly ContactChannel[] {
  const channels: ContactChannel[] = [];
  if (COMPANY_EMAIL.trim() !== '') {
    channels.push({ key: 'email', label: 'Email', href: `mailto:${COMPANY_EMAIL.trim()}` });
  }
  if (COMPANY_PHONE.trim() !== '') {
    channels.push({ key: 'telepon', label: 'Telepon', href: `tel:${COMPANY_PHONE.trim().replaceAll(' ', '')}` });
  }
  const seen = new Set<string>();
  const pick = (key: string): string => {
    const site = siteSocials[key]?.trim() ?? '';
    if (site !== '') return site;
    return COMPANY_SOCIALS[key]?.trim() ?? '';
  };
  for (const key of SOCIAL_ORDER) {
    const href = pick(key);
    if (href === '') continue;
    seen.add(key);
    channels.push({ key, label: labelFor(key), href });
  }
  for (const [key, raw] of Object.entries(siteSocials)) {
    const href = raw.trim();
    if (href === '' || seen.has(key.toLowerCase())) continue;
    channels.push({ key: key.toLowerCase(), label: labelFor(key.toLowerCase()), href });
  }
  return channels;
}
